import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  MessageSquare,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Phone,
  Shield,
  Zap,
  ExternalLink,
  RefreshCw,
  Unplug,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// ============================================================
// WhatsApp Settings — Embedded Signup (zero credenciais manuais)
// Fluxo: clicar → popup Meta → autorizar → pronto
// ============================================================

// Declare Facebook SDK types
declare global {
  interface Window {
    FB: {
      init: (params: any) => void;
      login: (callback: (response: any) => void, params: any) => void;
    };
    fbAsyncInit: () => void;
  }
}

export default function WhatsAppSettings() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // Connection status query
  const { data: status, isLoading } = trpc.whatsapp.getConnectionStatus.useQuery(
    undefined,
    { enabled: isAuthenticated, refetchInterval: 30000 }
  );

  // Embedded Signup config query (only fetch when not connected)
  const { data: signupConfig } = trpc.whatsapp.getEmbeddedSignupConfig.useQuery(
    undefined,
    {
      enabled: isAuthenticated && status?.status !== "connected",
      retry: false,
    }
  );

  // Mutations
  const exchangeCodeMutation = trpc.whatsapp.exchangeCode.useMutation({
    onSuccess: (data) => {
      toast.success("WhatsApp conectado com sucesso!", {
        description: data.phoneNumber
          ? `Número: ${data.phoneNumber}`
          : "Integração ativada.",
      });
      setConnecting(false);
      // Show webhook info
      if (data.webhookVerifyToken) {
        setWebhookInfo({
          url: `${window.location.origin}${data.webhookUrl}`,
          verifyToken: data.webhookVerifyToken,
        });
        setShowWebhookDialog(true);
      }
      utils.whatsapp.getConnectionStatus.invalidate();
    },
    onError: (err: any) => {
      toast.error("Erro ao conectar WhatsApp", { description: err.message });
      setConnecting(false);
    },
  });

  const disconnectMutation = trpc.whatsapp.disconnect.useMutation({
    onSuccess: () => {
      toast.success("WhatsApp desconectado.");
      setShowDisconnectDialog(false);
      utils.whatsapp.getConnectionStatus.invalidate();
    },
    onError: (err: any) => {
      toast.error("Erro ao desconectar", { description: err.message });
    },
  });

  const testMutation = trpc.whatsapp.testConnection.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Conexão validada!", {
          description: result.verifiedName
            ? `Nome verificado: ${result.verifiedName}`
            : "Token e credenciais estão funcionando.",
        });
      } else {
        toast.error("Falha na validação", {
          description: result.error ?? "Verifique as credenciais.",
        });
      }
    },
    onError: (err: any) => {
      toast.error("Erro ao testar conexão", { description: err.message });
    },
  });

  const autoReplyMutation = trpc.whatsapp.updateAutoReply.useMutation({
    onSuccess: () => {
      toast.success("Resposta automática atualizada!");
      utils.whatsapp.getConnectionStatus.invalidate();
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar", { description: err.message });
    },
  });

  // State
  const [connecting, setConnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<{ url: string; verifyToken: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const sdkLoadedRef = useRef(false);

  // Manual connect state (fallback)
  const [manualToken, setManualToken] = useState("");
  const [manualPhoneId, setManualPhoneId] = useState("");

  const connectManualMutation = trpc.whatsapp.connect.useMutation({
    onSuccess: (data) => {
      toast.success("WhatsApp conectado com sucesso!");
      setShowManualDialog(false);
      setManualToken("");
      setManualPhoneId("");
      if (data.webhookVerifyToken) {
        setWebhookInfo({
          url: `${window.location.origin}${data.webhookUrl}`,
          verifyToken: data.webhookVerifyToken,
        });
        setShowWebhookDialog(true);
      }
      utils.whatsapp.getConnectionStatus.invalidate();
    },
    onError: (err: any) => {
      toast.error("Erro ao conectar", { description: err.message });
    },
  });

  // Auto-reply state
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(status?.autoReplyEnabled ?? true);
  const [autoReplyMessage, setAutoReplyMessage] = useState(status?.autoReplyMessage ?? "");
  const [autoReplyDirty, setAutoReplyDirty] = useState(false);

  // Update auto-reply state when status loads
  const prevAutoReply = useState({ enabled: status?.autoReplyEnabled, message: status?.autoReplyMessage });
  if (
    status &&
    !autoReplyDirty &&
    (prevAutoReply[0].enabled !== status.autoReplyEnabled || prevAutoReply[0].message !== status.autoReplyMessage)
  ) {
    setAutoReplyEnabled(status.autoReplyEnabled);
    setAutoReplyMessage(status.autoReplyMessage ?? "");
    prevAutoReply[1]({ enabled: status.autoReplyEnabled, message: status.autoReplyMessage });
  }

  // Load Facebook SDK
  useEffect(() => {
    if (sdkLoadedRef.current || !signupConfig?.appId) return;

    const loadFBSDK = () => {
      // Check if already loaded
      if (document.getElementById("facebook-jssdk")) {
        if (window.FB) {
          window.FB.init({
            appId: signupConfig.appId,
            cookie: true,
            xfbml: true,
            version: signupConfig.sdkVersion,
          });
          sdkLoadedRef.current = true;
        }
        return;
      }

      window.fbAsyncInit = function () {
        window.FB.init({
          appId: signupConfig.appId,
          cookie: true,
          xfbml: true,
          version: signupConfig.sdkVersion,
        });
        sdkLoadedRef.current = true;
      };

      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    };

    loadFBSDK();
  }, [signupConfig?.appId, signupConfig?.sdkVersion]);

  // Handle Embedded Signup message event
  const handleEmbeddedMessage = useCallback(
    (event: MessageEvent) => {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      )
        return;

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (data.type === "WA_EMBEDDED_SIGNUP") {
          if (data.event === "FINISH") {
            // Success — we'll get the code from FB.login callback
            console.log("[Embedded Signup] FINISH event:", data.data);
          } else if (data.event === "CANCEL") {
            toast.info("Conexão cancelada pelo usuário.");
            setConnecting(false);
          } else if (data.event === "ERROR") {
            toast.error("Erro no processo de conexão", {
              description: "Tente novamente ou use a conexão manual.",
            });
            setConnecting(false);
          }
        }
      } catch {
        // Ignore non-JSON messages
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener("message", handleEmbeddedMessage);
    return () => window.removeEventListener("message", handleEmbeddedMessage);
  }, [handleEmbeddedMessage]);

  // Start Embedded Signup flow
  function startEmbeddedSignup() {
    if (!signupConfig?.appId || !signupConfig?.configId) {
      toast.error("Configuração do Embedded Signup não disponível.", {
        description: "Entre em contato com o suporte.",
      });
      return;
    }

    if (!window.FB) {
      toast.error("Facebook SDK não carregou.", {
        description: "Verifique sua conexão e tente novamente.",
      });
      return;
    }

    setConnecting(true);

    // Listen for the message event with phone_number_id and waba_id
    const messageHandler = (event: MessageEvent) => {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      )
        return;

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (data.type === "WA_EMBEDDED_SIGNUP" && data.event === "FINISH" && data.data) {
          // Store the phone_number_id and waba_id for the code exchange
          sessionStorage.setItem(
            "wa_embedded_data",
            JSON.stringify({
              phoneNumberId: data.data.phone_number_id,
              wabaId: data.data.waba_id,
            })
          );
          window.removeEventListener("message", messageHandler);
        }
      } catch {
        // Ignore
      }
    };
    window.addEventListener("message", messageHandler);

    window.FB.login(
      (response: any) => {
        if (response.authResponse?.code) {
          // Get the stored phone_number_id and waba_id
          const storedData = sessionStorage.getItem("wa_embedded_data");
          let phoneNumberId = "";
          let wabaId = "";

          if (storedData) {
            try {
              const parsed = JSON.parse(storedData);
              phoneNumberId = parsed.phoneNumberId || "";
              wabaId = parsed.wabaId || "";
            } catch {
              // Ignore parse errors
            }
            sessionStorage.removeItem("wa_embedded_data");
          }

          if (!phoneNumberId || !wabaId) {
            toast.error("Dados incompletos da Meta.", {
              description: "O phone_number_id ou waba_id não foram recebidos. Tente novamente.",
            });
            setConnecting(false);
            return;
          }

          // Exchange the code for an access token on the backend
          exchangeCodeMutation.mutate({
            code: response.authResponse.code,
            phoneNumberId,
            wabaId,
          });
        } else {
          toast.info("Conexão cancelada.");
          setConnecting(false);
        }
        window.removeEventListener("message", messageHandler);
      },
      {
        config_id: signupConfig.configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: "3",
        },
      }
    );
  }

  function handleSaveAutoReply() {
    autoReplyMutation.mutate({
      autoReplyEnabled,
      autoReplyMessage: autoReplyMessage.trim() || null,
    });
    setAutoReplyDirty(false);
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const connectionStatus = status?.status ?? "not_connected";
  const isConnected = connectionStatus === "connected";
  const hasError = connectionStatus === "error";
  const hasEmbeddedSignup = !!(signupConfig?.appId && signupConfig?.configId);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              WhatsApp
            </h1>
            <p className="text-sm text-muted-foreground">
              Conecte seu WhatsApp Business para receber e responder mensagens
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CONNECTION STATUS CARD */}
        {/* ============================================================ */}
        <div
          className={`rounded-xl border-2 p-6 transition-all ${
            isConnected
              ? "border-green-300 bg-green-50/50"
              : hasError
              ? "border-red-300 bg-red-50/50"
              : "border-dashed border-muted-foreground/30 bg-muted/20"
          }`}
        >
          {/* Status: NOT CONNECTED */}
          {!isConnected && !hasError && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                <WifiOff className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  WhatsApp não conectado
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Conecte seu número do WhatsApp Business para começar a receber mensagens dos seus clientes.
                </p>
              </div>

              {/* Primary: Embedded Signup button */}
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={startEmbeddedSignup}
                disabled={connecting || !hasEmbeddedSignup}
              >
                {connecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                {connecting ? "Conectando..." : "Conectar WhatsApp"}
              </Button>

              {!hasEmbeddedSignup && (
                <p className="text-xs text-amber-600">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Embedded Signup não configurado. Use a conexão manual abaixo.
                </p>
              )}

              {/* Secondary: Manual connection link */}
              <div className="pt-2">
                <button
                  className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                  onClick={() => {
                    setShowManualDialog(true);
                    setManualToken("");
                    setManualPhoneId("");
                  }}
                >
                  Conexão manual (avançado)
                </button>
              </div>
            </div>
          )}

          {/* Status: CONNECTED */}
          {isConnected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Wifi className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-heading text-lg font-semibold text-green-800">
                        Conectado
                      </h2>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    {status?.phoneNumber && (
                      <p className="text-sm text-green-700 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {status.phoneNumber}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testMutation.mutate()}
                    disabled={testMutation.isPending}
                  >
                    {testMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span className="ml-1.5 hidden sm:inline">Testar</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setShowDisconnectDialog(true)}
                  >
                    <Unplug className="w-4 h-4" />
                    <span className="ml-1.5 hidden sm:inline">Desconectar</span>
                  </Button>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-lg bg-white/60 border p-3">
                  <p className="text-xs text-muted-foreground">Conversas</p>
                  <p className="text-lg font-semibold">{status?.conversationCount ?? 0}</p>
                </div>
                <div
                  className="rounded-lg bg-white/60 border p-3 cursor-pointer hover:bg-white/80 transition-colors"
                  onClick={() => navigate("/dashboard/whatsapp/conversations")}
                >
                  <p className="text-xs text-muted-foreground">Ver conversas</p>
                  <p className="text-sm font-medium text-primary flex items-center gap-1">
                    Abrir <ExternalLink className="w-3 h-3" />
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status: ERROR */}
          {hasError && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-semibold text-red-700">
                  Erro na conexão
                </h2>
                <p className="text-sm text-red-600 mt-1">
                  A integração está ativa mas as credenciais estão incompletas. Reconecte o WhatsApp.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={startEmbeddedSignup}
                  disabled={connecting || !hasEmbeddedSignup}
                >
                  {connecting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Reconectar
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600"
                  onClick={() => setShowDisconnectDialog(true)}
                >
                  <Unplug className="w-4 h-4 mr-2" />
                  Desconectar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* AUTO-REPLY SECTION (only when connected) */}
        {/* ============================================================ */}
        {isConnected && (
          <div className="rounded-xl border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold text-foreground">
                  Resposta automática
                </h3>
                <p className="text-sm text-muted-foreground">
                  Envie uma mensagem automática quando um novo cliente entrar em contato
                </p>
              </div>
              <Switch
                checked={autoReplyEnabled}
                onCheckedChange={(checked) => {
                  setAutoReplyEnabled(checked);
                  setAutoReplyDirty(true);
                }}
              />
            </div>

            {autoReplyEnabled && (
              <div className="space-y-2">
                <Label className="text-sm">Mensagem</Label>
                <Textarea
                  placeholder="Olá! Obrigado por entrar em contato. Em breve retornaremos sua mensagem."
                  value={autoReplyMessage}
                  onChange={(e) => {
                    setAutoReplyMessage(e.target.value);
                    setAutoReplyDirty(true);
                  }}
                  rows={3}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {autoReplyMessage.length}/1000
                </p>
              </div>
            )}

            {autoReplyDirty && (
              <Button
                size="sm"
                onClick={handleSaveAutoReply}
                disabled={autoReplyMutation.isPending}
              >
                {autoReplyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* MANUAL CONNECT DIALOG (fallback for advanced users) */}
        {/* ============================================================ */}
        <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                Conexão Manual (Avançado)
              </DialogTitle>
              <DialogDescription>
                Use esta opção apenas se o Embedded Signup não estiver disponível.
                Você precisará obter as credenciais manualmente no Meta for Developers.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Token de Acesso <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="password"
                  placeholder="EAAxxxxxxx..."
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  System User Token com permissão <code className="bg-muted px-1 rounded text-xs">whatsapp_business_messaging</code>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Phone Number ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="123456789012345"
                  value={manualPhoneId}
                  onChange={(e) => setManualPhoneId(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowManualDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  if (!manualToken.trim() || !manualPhoneId.trim()) {
                    toast.error("Preencha o Token de Acesso e o Phone Number ID.");
                    return;
                  }
                  connectManualMutation.mutate({
                    accessToken: manualToken.trim(),
                    phoneNumberId: manualPhoneId.trim(),
                  });
                }}
                disabled={connectManualMutation.isPending || !manualToken.trim() || !manualPhoneId.trim()}
              >
                {connectManualMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Conectar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================================ */}
        {/* DISCONNECT DIALOG */}
        {/* ============================================================ */}
        <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Unplug className="w-5 h-5" />
                Desconectar WhatsApp
              </DialogTitle>
              <DialogDescription>
                Tem certeza que deseja desconectar o WhatsApp? As credenciais serão removidas e você deixará de receber mensagens.
                As conversas existentes serão mantidas.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDisconnectDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Unplug className="w-4 h-4 mr-2" />
                )}
                Sim, desconectar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================================ */}
        {/* WEBHOOK INFO DIALOG (shown after successful connection) */}
        {/* ============================================================ */}
        <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Configuração do Webhook
              </DialogTitle>
              <DialogDescription>
                Configure esses dados no Meta for Developers para receber mensagens do WhatsApp.
              </DialogDescription>
            </DialogHeader>

            {webhookInfo && (
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Webhook URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={webhookInfo.url}
                      className="font-mono text-xs bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(webhookInfo.url, "url")}
                    >
                      {copiedField === "url" ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Token de Verificação</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={webhookInfo.verifyToken}
                      className="font-mono text-xs bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(webhookInfo.verifyToken, "token")}
                    >
                      {copiedField === "token" ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Como configurar:</strong> No Meta for Developers, vá em seu app → WhatsApp → Configuração → Webhook.
                    Cole a URL acima no campo "Callback URL" e o token no campo "Verify Token".
                    Assine os campos: <code className="bg-blue-100 px-1 rounded">messages</code>.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setShowWebhookDialog(false)}>
                Entendi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
