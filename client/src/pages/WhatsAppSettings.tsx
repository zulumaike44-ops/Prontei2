import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
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
  QrCode,
  Check,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// ============================================================
// WhatsApp Settings — Z-API (QR Code + credenciais simples)
// Fluxo: preencher credenciais → escanear QR Code → pronto
// ============================================================

export default function WhatsAppSettings() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // Connection status query
  const { data: status, isLoading } = trpc.whatsapp.getConnectionStatus.useQuery(
    undefined,
    { enabled: isAuthenticated, refetchInterval: 30000 }
  );

  // Mutations
  const saveCredentialsMutation = trpc.whatsapp.saveZApiCredentials.useMutation({
    onSuccess: () => {
      toast.success("Credenciais Z-API salvas!", {
        description: "Agora escaneie o QR Code para conectar seu WhatsApp.",
      });
      setShowCredentialsDialog(false);
      setShowQrCodeDialog(true);
      utils.whatsapp.getConnectionStatus.invalidate();
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar credenciais", { description: err.message });
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
          description: "Instância Z-API conectada e funcionando.",
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
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [showQrCodeDialog, setShowQrCodeDialog] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  // Credentials form state
  const [instanceId, setInstanceId] = useState("");
  const [instanceToken, setInstanceToken] = useState("");
  const [clientToken, setClientToken] = useState("");

  // QR Code state
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrAlreadyConnected, setQrAlreadyConnected] = useState(false);
  const qrIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrAttemptRef = useRef(0);

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

  // QR Code polling via tRPC
  const qrCodeQuery = trpc.whatsapp.getQrCode.useQuery(undefined, {
    enabled: false, // manual fetch only
  });

  async function fetchQrCode() {
    setQrLoading(true);
    setQrError(null);
    setQrAlreadyConnected(false);

    try {
      const result = await utils.whatsapp.getQrCode.fetch();

      if (result.success && result.qrCode) {
        // result.qrCode is base64 image
        const imgSrc = typeof result.qrCode === "string"
          ? (result.qrCode.startsWith("data:") ? result.qrCode : `data:image/png;base64,${result.qrCode}`)
          : "";
        setQrCodeImage(imgSrc);
        qrAttemptRef.current++;
      } else if (result.alreadyConnected) {
        setQrAlreadyConnected(true);
        setQrCodeImage(null);
        stopQrPolling();
        toast.success("WhatsApp já está conectado!");
        utils.whatsapp.getConnectionStatus.invalidate();
      } else {
        setQrError(result.error ?? "Erro ao obter QR Code");
      }
    } catch (err: any) {
      setQrError(err.message ?? "Erro ao obter QR Code");
    } finally {
      setQrLoading(false);
    }
  }

  function startQrPolling() {
    qrAttemptRef.current = 0;
    fetchQrCode();

    // Poll every 15 seconds (QR code expires every 20s)
    qrIntervalRef.current = setInterval(() => {
      if (qrAttemptRef.current >= 3) {
        // After 3 attempts, stop polling and ask user to retry
        stopQrPolling();
        setQrError("QR Code expirou. Clique em 'Gerar novo QR Code' para tentar novamente.");
        return;
      }
      fetchQrCode();
    }, 15000);
  }

  function stopQrPolling() {
    if (qrIntervalRef.current) {
      clearInterval(qrIntervalRef.current);
      qrIntervalRef.current = null;
    }
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopQrPolling();
  }, []);

  function handleSaveCredentials() {
    if (!instanceId.trim() || !instanceToken.trim()) {
      toast.error("Preencha o Instance ID e o Instance Token.");
      return;
    }
    saveCredentialsMutation.mutate({
      instanceId: instanceId.trim(),
      instanceToken: instanceToken.trim(),
      clientToken: clientToken.trim() || null,
    });
  }

  function handleSaveAutoReply() {
    autoReplyMutation.mutate({
      autoReplyEnabled,
      autoReplyMessage: autoReplyMessage.trim() || null,
    });
    setAutoReplyDirty(false);
  }

  function openQrCodeDialog() {
    setShowQrCodeDialog(true);
    startQrPolling();
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
              Conecte seu WhatsApp para receber e responder mensagens via Z-API
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
                  Conecte seu número do WhatsApp para começar a receber mensagens dos seus clientes.
                </p>
              </div>

              {/* Step 1: Configure credentials */}
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  setShowCredentialsDialog(true);
                  setInstanceId("");
                  setInstanceToken("");
                  setClientToken("");
                }}
              >
                <Zap className="w-4 h-4 mr-2" />
                Conectar WhatsApp
              </Button>

              {/* Help text */}
              <div className="pt-2 text-xs text-muted-foreground space-y-1">
                <p>
                  Você precisa de uma conta na{" "}
                  <a
                    href="https://www.z-api.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80"
                  >
                    Z-API
                  </a>{" "}
                  (a partir de R$ 99,90/mês).
                </p>
                <p>
                  Crie uma instância no painel da Z-API e copie o Instance ID e Token.
                </p>
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
                    <p className="text-xs text-green-600/70 mt-0.5">
                      via Z-API
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
                    onClick={openQrCodeDialog}
                  >
                    <QrCode className="w-4 h-4" />
                    <span className="ml-1.5 hidden sm:inline">QR Code</span>
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
                  A integração está ativa mas as credenciais estão incompletas. Reconfigure as credenciais Z-API.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    setShowCredentialsDialog(true);
                    setInstanceId("");
                    setInstanceToken("");
                    setClientToken("");
                  }}
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  Reconfigurar
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
        {/* HOW IT WORKS SECTION */}
        {/* ============================================================ */}
        {!isConnected && (
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
                  <p className="text-sm font-medium">Crie uma conta na Z-API</p>
                  <p className="text-xs text-muted-foreground">
                    Acesse{" "}
                    <a href="https://www.z-api.io" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      z-api.io
                    </a>{" "}
                    e crie uma instância. Planos a partir de R$ 99,90/mês.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-sm font-bold text-green-700">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium">Copie as credenciais</p>
                  <p className="text-xs text-muted-foreground">
                    No painel da Z-API, copie o Instance ID, Instance Token e Client Token (segurança).
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-sm font-bold text-green-700">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium">Cole aqui e escaneie o QR Code</p>
                  <p className="text-xs text-muted-foreground">
                    Clique em "Conectar WhatsApp", cole as credenciais e escaneie o QR Code com seu celular.
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
                    Seu chatbot de agendamento começa a funcionar automaticamente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* CREDENTIALS DIALOG */}
        {/* ============================================================ */}
        <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                Credenciais Z-API
              </DialogTitle>
              <DialogDescription>
                Copie as credenciais do painel da Z-API e cole aqui. Você encontra esses dados na página da sua instância.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Instance ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="A20DA9C0183A2D35A260F53F5D2B9244"
                  value={instanceId}
                  onChange={(e) => setInstanceId(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Identificador único da sua instância Z-API
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Instance Token <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="password"
                  placeholder="Token da instância"
                  value={instanceToken}
                  onChange={(e) => setInstanceToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Token de autenticação da instância
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Client Token <span className="text-muted-foreground">(recomendado)</span>
                </Label>
                <Input
                  type="password"
                  placeholder="Token de segurança da conta"
                  value={clientToken}
                  onChange={(e) => setClientToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Token de segurança da sua conta Z-API. Encontre em Segurança no painel.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCredentialsDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleSaveCredentials}
                disabled={saveCredentialsMutation.isPending || !instanceId.trim() || !instanceToken.trim()}
              >
                {saveCredentialsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Salvar e Conectar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================================ */}
        {/* QR CODE DIALOG */}
        {/* ============================================================ */}
        <Dialog
          open={showQrCodeDialog}
          onOpenChange={(open) => {
            setShowQrCodeDialog(open);
            if (!open) stopQrPolling();
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-green-600" />
                Conectar WhatsApp
              </DialogTitle>
              <DialogDescription>
                Abra o WhatsApp no celular, vá em Dispositivos conectados e escaneie o QR Code abaixo.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center py-4 space-y-4">
              {qrLoading && !qrCodeImage && (
                <div className="w-64 h-64 flex items-center justify-center bg-muted/20 rounded-lg">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {qrCodeImage && !qrAlreadyConnected && (
                <div className="p-3 bg-white rounded-lg shadow-sm border">
                  <img
                    src={qrCodeImage}
                    alt="QR Code WhatsApp"
                    className="w-64 h-64 object-contain"
                  />
                </div>
              )}

              {qrAlreadyConnected && (
                <div className="w-64 h-64 flex flex-col items-center justify-center bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mb-3" />
                  <p className="text-sm font-medium text-green-700">Já conectado!</p>
                  <p className="text-xs text-green-600 mt-1">Não é necessário escanear novamente.</p>
                </div>
              )}

              {qrError && !qrLoading && (
                <div className="w-64 flex flex-col items-center justify-center space-y-3 py-6">
                  <AlertTriangle className="w-10 h-10 text-amber-500" />
                  <p className="text-sm text-center text-muted-foreground">{qrError}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      qrAttemptRef.current = 0;
                      startQrPolling();
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Gerar novo QR Code
                  </Button>
                </div>
              )}

              {!qrError && !qrAlreadyConnected && qrCodeImage && (
                <div className="text-center space-y-1">
                  <p className="text-xs text-muted-foreground">
                    O QR Code atualiza automaticamente a cada 15 segundos.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Após escanear, aguarde alguns segundos para a conexão ser estabelecida.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowQrCodeDialog(false);
                  stopQrPolling();
                }}
              >
                Fechar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  testMutation.mutate();
                }}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Verificar conexão
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
      </div>
    </DashboardLayout>
  );
}
