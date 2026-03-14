import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Phone,
  Shield,
  Zap,
  ExternalLink,
  RefreshCw,
  Unplug,
  Check,
  BadgeCheck,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// ============================================================
// WhatsApp Settings — Meta Cloud API (Embedded Signup)
// Fluxo: Embedded Signup → token exchange → pronto
// ============================================================

// Declare Facebook SDK types
declare global {
  interface Window {
    FB: any;
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

  // Meta config query (appId, configId)
  const { data: metaConfig } = trpc.whatsapp.getMetaConfig.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Mutations
  const completeSignupMutation = trpc.whatsapp.completeEmbeddedSignup.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("WhatsApp conectado com sucesso!", {
          description: result.displayPhoneNumber
            ? `Número: ${result.displayPhoneNumber}`
            : "Configuração concluída.",
        });
        utils.whatsapp.getConnectionStatus.invalidate();
      } else {
        toast.error("Erro ao configurar WhatsApp", {
          description: result.error ?? "Tente novamente.",
        });
      }
      setIsSigningUp(false);
    },
    onError: (err: any) => {
      toast.error("Erro ao completar configuração", { description: err.message });
      setIsSigningUp(false);
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
          description: `WhatsApp Business API funcionando${result.verifiedName ? ` — ${result.verifiedName}` : ""}.`,
        });
      } else {
        toast.error("Falha na validação", {
          description: result.error ?? "Verifique a configuração.",
        });
      }
      utils.whatsapp.getConnectionStatus.invalidate();
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
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [fbSdkLoaded, setFbSdkLoaded] = useState(false);

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
    const appId = metaConfig?.appId;
    if (!appId) return;

    const initFB = () => {
      if (window.FB) {
        window.FB.init({
          appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: "v21.0",
        });
        setFbSdkLoaded(true);
      }
    };

    // If SDK already loaded (e.g. navigated back), re-init
    if (window.FB) {
      initFB();
      return;
    }

    // Set callback for when SDK finishes loading
    window.fbAsyncInit = initFB;

    // Load SDK script if not already in DOM
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/pt_BR/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [metaConfig?.appId]);

  // Handle Embedded Signup session info message
  const handleSessionInfoMessage = useCallback(
    (event: MessageEvent) => {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        if (data.type === "WA_EMBEDDED_SIGNUP") {
          if (data.event === "FINISH") {
            // User completed the signup — phone_number_id available
            console.log("[Meta Embedded Signup] Completed:", data.data);
          } else if (data.event === "CANCEL") {
            console.log("[Meta Embedded Signup] Cancelled by user");
            setIsSigningUp(false);
            toast.info("Configuração cancelada.");
          } else if (data.event === "ERROR") {
            console.error("[Meta Embedded Signup] Error:", data.data);
            setIsSigningUp(false);
            toast.error("Erro no processo de configuração.");
          }
        }
      } catch {
        // Not a JSON message, ignore
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener("message", handleSessionInfoMessage);
    return () => window.removeEventListener("message", handleSessionInfoMessage);
  }, [handleSessionInfoMessage]);

  // Launch Embedded Signup
  function launchEmbeddedSignup() {
    if (!window.FB || !fbSdkLoaded) {
      toast.error("Facebook SDK ainda não carregou. Aguarde um momento e tente novamente.");
      return;
    }

    if (!metaConfig?.appId || !metaConfig?.configId) {
      toast.error("Configuração Meta não disponível. Entre em contato com o suporte.");
      return;
    }

    setIsSigningUp(true);

    window.FB.login(
      function (response: any) {
        if (response.authResponse) {
          const code = response.authResponse.code;
          if (code) {
            // Exchange code for token on backend
            completeSignupMutation.mutate({ code });
          } else {
            toast.error("Código de autorização não recebido. Tente novamente.");
            setIsSigningUp(false);
          }
        } else {
          // User cancelled or didn't authorize
          setIsSigningUp(false);
        }
      },
      {
        config_id: metaConfig.configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: 2,
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

  const connectionStatus = status?.status ?? "disconnected";
  const isConnected = connectionStatus === "connected";
  const isPendingVerification = connectionStatus === "pending_verification";
  const hasError = connectionStatus === "error";
  const hasCredentials = status?.hasCredentials ?? false;

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
              Conecte seu WhatsApp Business para receber e responder mensagens automaticamente
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
              : isPendingVerification
              ? "border-amber-300 bg-amber-50/50"
              : hasError
              ? "border-red-300 bg-red-50/50"
              : "border-dashed border-muted-foreground/30 bg-muted/20"
          }`}
        >
          {/* Status: DISCONNECTED */}
          {connectionStatus === "disconnected" && (
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

              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={launchEmbeddedSignup}
                disabled={isSigningUp || !fbSdkLoaded}
              >
                {isSigningUp ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                {isSigningUp ? "Conectando..." : "Conectar WhatsApp Business"}
              </Button>

              <div className="pt-2 text-xs text-muted-foreground space-y-1">
                <p className="flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" />
                  Integração oficial via Meta WhatsApp Business API
                </p>
                <p>
                  Sem risco de bloqueio. Sem necessidade de manter o celular conectado.
                </p>
              </div>
            </div>
          )}

          {/* Status: PENDING VERIFICATION */}
          {isPendingVerification && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-semibold text-amber-800">
                  Verificação pendente
                </h2>
                <p className="text-sm text-amber-700 mt-1">
                  Sua conta WhatsApp Business está sendo verificada pela Meta. Isso pode levar alguns minutos.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
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
                  <span className="ml-1.5">Verificar status</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => setShowDisconnectDialog(true)}
                >
                  <Unplug className="w-4 h-4 mr-1" />
                  Desconectar
                </Button>
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
                    {(status?.displayPhoneNumber || status?.phoneNumber) && (
                      <p className="text-sm text-green-700 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {status.displayPhoneNumber || status.phoneNumber}
                      </p>
                    )}
                    {status?.verifiedName && (
                      <p className="text-xs text-green-600/80 flex items-center gap-1 mt-0.5">
                        <BadgeCheck className="w-3 h-3" />
                        {status.verifiedName}
                      </p>
                    )}
                    {status?.qualityRating && (
                      <p className="text-xs text-green-600/70 flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Qualidade: {status.qualityRating}
                      </p>
                    )}
                    <p className="text-xs text-green-600/70 mt-0.5">
                      via Meta WhatsApp Business API
                    </p>
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
                  A integração está ativa mas houve um problema com as credenciais. Reconecte o WhatsApp Business.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={launchEmbeddedSignup}
                  disabled={isSigningUp || !fbSdkLoaded}
                >
                  {isSigningUp ? (
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
        {/* AUTO-REPLY SECTION (only when connected or pending) */}
        {/* ============================================================ */}
        {(isConnected || isPendingVerification) && (
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
        {/* HOW IT WORKS SECTION */}
        {/* ============================================================ */}
        {connectionStatus === "disconnected" && (
          <div className="rounded-xl border p-6 space-y-4">
            <h3 className="font-heading font-semibold text-foreground">
              Como funciona?
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-sm font-bold text-green-700">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium">Clique em "Conectar WhatsApp Business"</p>
                  <p className="text-xs text-muted-foreground">
                    Uma janela do Facebook será aberta para você autorizar a conexão.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-sm font-bold text-green-700">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium">Crie ou selecione sua conta Business</p>
                  <p className="text-xs text-muted-foreground">
                    Se você já tem uma conta Meta Business, selecione-a. Caso contrário, uma será criada automaticamente.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-sm font-bold text-green-700">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium">Adicione seu número de telefone</p>
                  <p className="text-xs text-muted-foreground">
                    Informe o número que receberá as mensagens. Você receberá um código de verificação por SMS.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-sm font-bold text-green-700">
                  4
                </div>
                <div>
                  <p className="text-sm font-medium">Pronto!</p>
                  <p className="text-xs text-muted-foreground">
                    Seu chatbot de agendamento começa a funcionar automaticamente. Sem necessidade de manter o celular conectado.
                  </p>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-foreground mb-2">Vantagens da API oficial:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  Sem risco de bloqueio do número
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  Não precisa manter celular ligado
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  1.000 conversas/mês gratuitas
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  Selo de verificação no WhatsApp
                </div>
              </div>
            </div>
          </div>
        )}

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
      </div>
    </DashboardLayout>
  );
}
