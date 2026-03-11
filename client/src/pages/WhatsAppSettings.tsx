import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MessageSquare, Settings, CheckCircle2, XCircle, Info } from "lucide-react";
import { toast } from "sonner";

export default function WhatsAppSettings() {
  const { isAuthenticated } = useAuth();

  const { data: settings, isLoading } = trpc.whatsapp.getSettings.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const updateMutation = trpc.whatsapp.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      utils.whatsapp.getSettings.invalidate();
    },
    onError: (err) => {
      toast.error("Erro ao salvar configurações", { description: err.message });
    },
  });

  const utils = trpc.useUtils();

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [provider, setProvider] = useState("meta");
  const [accessToken, setAccessToken] = useState("");
  const [webhookVerifyToken, setWebhookVerifyToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [autoReplyMessage, setAutoReplyMessage] = useState("");

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      setIsEnabled(settings.isEnabled);
      setPhoneNumber(settings.phoneNumber ?? "");
      setProvider(settings.provider);
      setAccessToken(""); // Don't show masked token
      setWebhookVerifyToken(settings.webhookVerifyToken ?? "");
      setPhoneNumberId(settings.phoneNumberId ?? "");
      setBusinessAccountId(settings.businessAccountId ?? "");
      setAutoReplyEnabled(settings.autoReplyEnabled);
      setAutoReplyMessage(settings.autoReplyMessage ?? "");
    }
  }, [settings]);

  function handleSave() {
    const data: Record<string, unknown> = {
      isEnabled,
      phoneNumber: phoneNumber || null,
      provider,
      webhookVerifyToken: webhookVerifyToken || null,
      phoneNumberId: phoneNumberId || null,
      businessAccountId: businessAccountId || null,
      autoReplyEnabled,
      autoReplyMessage: autoReplyMessage || null,
    };

    // Only send accessToken if user typed a new one
    if (accessToken.trim()) {
      data.accessToken = accessToken;
    }

    updateMutation.mutate(data as any);
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

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
              Configure a integração com WhatsApp do seu estabelecimento
            </p>
          </div>
        </div>

        {/* Status Banner */}
        <div
          className={`flex items-center gap-3 p-4 rounded-lg border ${
            isEnabled
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-muted/50 border-border text-muted-foreground"
          }`}
        >
          {isEnabled ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-muted-foreground shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-medium text-sm">
              {isEnabled ? "Integração ativa" : "Integração desativada"}
            </p>
            <p className="text-xs opacity-80">
              {isEnabled
                ? "O WhatsApp está configurado para receber mensagens."
                : "Ative a integração para começar a receber mensagens."}
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>

        {/* Configuration Form */}
        <div className="bg-card rounded-xl border border-border/50 p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-heading text-base font-semibold text-foreground">
              Configurações do Provider
            </h2>
          </div>

          <div className="grid gap-4">
            {/* Provider */}
            <div className="space-y-2">
              <Label>Provedor</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o provedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meta">Meta Cloud API (oficial)</SelectItem>
                  <SelectItem value="z-api">Z-API</SelectItem>
                  <SelectItem value="evolution">Evolution API</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label>Número do WhatsApp</Label>
              <Input
                placeholder="5511999998888"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Número completo com código do país (sem +)
              </p>
            </div>

            {/* Phone Number ID (Meta) */}
            {provider === "meta" && (
              <>
                <div className="space-y-2">
                  <Label>Phone Number ID</Label>
                  <Input
                    placeholder="ID do número no Meta Business"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Business Account ID (WABA)</Label>
                  <Input
                    placeholder="ID da conta comercial"
                    value={businessAccountId}
                    onChange={(e) => setBusinessAccountId(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Access Token */}
            <div className="space-y-2">
              <Label>Token de Acesso</Label>
              <Input
                type="password"
                placeholder={settings?.accessToken ? "••••••••" : "Cole o token aqui"}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {settings?.accessToken
                  ? "Token já configurado. Deixe em branco para manter o atual."
                  : "Token de autenticação do provedor."}
              </p>
            </div>

            {/* Webhook Verify Token */}
            <div className="space-y-2">
              <Label>Token de Verificação do Webhook</Label>
              <Input
                placeholder="Token para validação do webhook"
                value={webhookVerifyToken}
                onChange={(e) => setWebhookVerifyToken(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Auto Reply */}
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
              onCheckedChange={setAutoReplyEnabled}
            />
          </div>

          {autoReplyEnabled && (
            <div className="space-y-2">
              <Label>Mensagem de boas-vindas</Label>
              <Textarea
                placeholder="Olá! Você entrou em contato com nosso estabelecimento. Em breve você poderá agendar por aqui. Sua mensagem foi recebida!"
                value={autoReplyMessage}
                onChange={(e) => setAutoReplyMessage(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Enviada automaticamente na primeira mensagem de uma nova conversa.
                Deixe em branco para usar a mensagem padrão.
              </p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Como configurar</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Crie um app no Meta for Developers e configure o WhatsApp Business</li>
                <li>Copie o Phone Number ID, WABA ID e Access Token</li>
                <li>Configure o webhook URL: <code className="bg-blue-100 px-1 rounded">{window.location.origin}/api/whatsapp/webhook</code></li>
                <li>Use o Token de Verificação configurado acima</li>
                <li>Ative a integração e salve</li>
              </ol>
              <p className="mt-2 text-xs opacity-80">
                O envio de mensagens usa a Meta Cloud API v21.0. Preencha corretamente o Phone Number ID e o Access Token para que as respostas sejam enviadas ao WhatsApp real.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-primary hover:bg-terracotta-dark text-primary-foreground"
          >
            {updateMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Salvar configurações
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
