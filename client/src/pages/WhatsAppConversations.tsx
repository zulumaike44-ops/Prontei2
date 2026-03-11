import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  MessageSquare,
  MessageCircle,
  User,
  Clock,
  ChevronRight,
  Inbox,
  Settings,
} from "lucide-react";

export default function WhatsAppConversations() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: conversations, isLoading } = trpc.whatsapp.listConversations.useQuery(
    statusFilter === "all" ? undefined : { status: statusFilter },
    { enabled: isAuthenticated }
  );

  const { data: settings } = trpc.whatsapp.getSettings.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  function formatDate(date: Date | string | null) {
    if (!date) return "—";
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">
                Conversas
              </h1>
              <p className="text-sm text-muted-foreground">
                Mensagens recebidas pelo WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="open">Abertas</SelectItem>
                <SelectItem value="closed">Fechadas</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard/whatsapp")}
            >
              <Settings className="w-4 h-4 mr-1" />
              Config
            </Button>
          </div>
        </div>

        {/* Not enabled warning */}
        {settings && !settings.isEnabled && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <p className="font-medium">WhatsApp desativado</p>
            <p className="text-xs mt-1">
              Ative a integração nas{" "}
              <button
                className="underline font-medium"
                onClick={() => navigate("/dashboard/whatsapp")}
              >
                configurações
              </button>{" "}
              para começar a receber mensagens.
            </p>
          </div>
        )}

        {/* Conversations List */}
        {!conversations || conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground mb-1">
              Nenhuma conversa ainda
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Quando clientes enviarem mensagens pelo WhatsApp, as conversas aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border/50 divide-y divide-border/50">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => navigate(`/dashboard/whatsapp/conversations/${conv.id}`)}
                className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-green-600" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm text-foreground truncate">
                      {conv.customerName || conv.phone}
                    </span>
                    <Badge
                      variant={conv.status === "open" ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0 shrink-0"
                    >
                      {conv.status === "open" ? "Aberta" : "Fechada"}
                    </Badge>
                  </div>
                  {conv.customerName && (
                    <p className="text-xs text-muted-foreground mb-0.5">
                      {conv.phone}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.lastMessagePreview || "Sem mensagens"}
                  </p>
                </div>

                {/* Meta */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(conv.lastMessageAt)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {conv.messageCount} msg{conv.messageCount !== 1 ? "s" : ""}
                  </span>
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
