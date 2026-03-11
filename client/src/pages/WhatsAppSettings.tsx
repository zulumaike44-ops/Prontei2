import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
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
// WhatsApp Settings — Tela simplificada tipo Booksy
// 4 estados: não conectado / conectando / conectado / erro
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
  const connectMutation = trpc.whatsapp.connect.useMutation({
    onSuccess: (data) => {
      toast.success("WhatsApp conectado com sucesso!");
      setShowConnectDialog(false);
      setConnectStep("idle");
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
      toast.error("Erro ao conectar", { description: err.message });
      setConnectStep("idle");
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

  // Dialog states
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [connectStep, setConnectStep] = useState<"idle" | "credentials">("idle");

  // Connect form state
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");

  // Webhook info after connect
  const [webhookInfo, setWebhookInfo] = useState<{ url: string; verifyToken: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  function handleConnect() {
    if (!accessToken.trim() || !phoneNumberId.trim()) {
      toast.error("Preencha o Token de Acesso e o Phone Number ID.");
      return;
    }
    connectMutation.mutate({
      accessToken: accessToken.trim(),
      phoneNumberId: phoneNumberId.trim(),
      phoneNumber: phoneNumber.trim() || undefined,
      businessAccountId: businessAccountId.trim() || undefined,
    });
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
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  setShowConnectDialog(true);
                  setConnectStep("credentials");
                  setAccessToken("");
                  setPhoneNumberId("");
                  setPhoneNumber("");
                  setBusinessAccountId("");
                }}
              >
                <Zap className="w-4 h-4 mr-2" />
                Conectar WhatsApp
              </Button>
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

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div
                  className="bg-white/80 rounded-lg p-3 border border-green-200 cursor-pointer hover:bg-white transition-colors"
                  onClick={() => navigate("/dashboard/whatsapp/conversations")}
                >
                  <p className="text-2xl font-bold text-green-800">
                    {status?.conversationCount ?? 0}
                  </p>
                  <p className="text-xs text-green-600">Conversas</p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 border border-green-200">
                  <p className="text-2xl font-bold text-green-800">
                    {status?.autoReplyEnabled ? "Ativa" : "Inativa"}
                  </p>
                  <p className="text-xs text-green-600">Resposta automática</p>
                </div>
              </div>
            </div>
          )}

          {/* Status: ERROR */}
          {hasError && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-semibold text-red-800">
                  Erro na conexão
                </h2>
                <p className="text-sm text-red-600 mt-1">
                  A integração está ativada mas as credenciais estão incompletas ou inválidas.
                  Reconecte para corrigir.
                </p>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    setShowConnectDialog(true);
                    setConnectStep("credentials");
                    setAccessToken("");
                    setPhoneNumberId("");
                    setPhoneNumber("");
                    setBusinessAccountId("");
                  }}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Reconectar
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
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
        {/* AUTO-REPLY SETTINGS (visible when connected) */}
        {/* ============================================================ */}
        {isConnected && (
          <div className="bg-card rounded-xl border border-border/50 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-heading text-base font-semibold text-foreground">
                  Resposta Automática
                </h2>
              </div>
              <Switch
                checked={autoReplyEnabled}
                onCheckedChange={(v) => {
                  setAutoReplyEnabled(v);
                  setAutoReplyDirty(true);
                }}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Quando ativada, uma mensagem de boas-vindas é enviada automaticamente na primeira mensagem de cada nova conversa.
            </p>

            {autoReplyEnabled && (
              <div className="space-y-2">
                <Label>Mensagem de boas-vindas</Label>
                <Textarea
                  placeholder="Olá! Você entrou em contato com nosso estabelecimento. Em breve atenderemos você. Sua mensagem foi recebida! 😊"
                  value={autoReplyMessage}
                  onChange={(e) => {
                    setAutoReplyMessage(e.target.value);
                    setAutoReplyDirty(true);
                  }}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para usar a mensagem padrão.
                </p>
              </div>
            )}

            {autoReplyDirty && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveAutoReply}
                  disabled={autoReplyMutation.isPending}
                  size="sm"
                >
                  {autoReplyMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Salvar
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* QUICK ACTIONS (visible when connected) */}
        {/* ============================================================ */}
        {isConnected && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 transition-colors text-left"
              onClick={() => navigate("/dashboard/whatsapp/conversations")}
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">Ver conversas</p>
                <p className="text-xs text-muted-foreground">
                  {(status?.conversationCount ?? 0) > 0
                    ? `${status?.conversationCount} conversas registradas`
                    : "Nenhuma conversa ainda"}
                </p>
              </div>
            </button>

            <button
              className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 transition-colors text-left"
              onClick={() => {
                setWebhookInfo({
                  url: `${window.location.origin}/api/whatsapp/webhook`,
                  verifyToken: "(salvo no servidor)",
                });
                setShowWebhookDialog(true);
              }}
            >
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">Webhook URL</p>
                <p className="text-xs text-muted-foreground">
                  Ver URL do webhook para configurar no Meta
                </p>
              </div>
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* CONNECT DIALOG */}
        {/* ============================================================ */}
        <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-600" />
                Conectar WhatsApp
              </DialogTitle>
              <DialogDescription>
                Insira as credenciais do seu WhatsApp Business. Você encontra esses dados no{" "}
                <a
                  href="https://developers.facebook.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline inline-flex items-center gap-0.5"
                >
                  Meta for Developers <ExternalLink className="w-3 h-3" />
                </a>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                <span>Copie as credenciais do Meta Business</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Token de Acesso <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    placeholder="EAAxxxxxxx..."
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
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
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    ID do número na seção WhatsApp do seu app Meta
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Número do WhatsApp <span className="text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    placeholder="5511999998888"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Business Account ID <span className="text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    placeholder="ID da conta comercial (WABA)"
                    value={businessAccountId}
                    onChange={(e) => setBusinessAccountId(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConnectDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleConnect}
                disabled={connectMutation.isPending || !accessToken.trim() || !phoneNumberId.trim()}
              >
                {connectMutation.isPending ? (
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
        {/* WEBHOOK INFO DIALOG */}
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
