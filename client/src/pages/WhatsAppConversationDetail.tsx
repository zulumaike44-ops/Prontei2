import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  Send,
  User,
  Bot,
  Phone,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function WhatsAppConversationDetail() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/dashboard/whatsapp/conversations/:id");
  const conversationId = params?.id ? parseInt(params.id) : 0;

  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  const { data: conversation, isLoading: convLoading } =
    trpc.whatsapp.getConversation.useQuery(
      { id: conversationId },
      { enabled: isAuthenticated && conversationId > 0 }
    );

  const { data: messages, isLoading: msgsLoading } =
    trpc.whatsapp.getMessages.useQuery(
      { conversationId, limit: 200 },
      { enabled: isAuthenticated && conversationId > 0, refetchInterval: 10000 }
    );

  const replyMutation = trpc.whatsapp.reply.useMutation({
    onSuccess: () => {
      setReplyText("");
      utils.whatsapp.getMessages.invalidate({ conversationId });
      utils.whatsapp.getConversation.invalidate({ id: conversationId });
      utils.whatsapp.listConversations.invalidate();
    },
    onError: (err) => {
      toast.error("Erro ao enviar mensagem", { description: err.message });
    },
  });

  const closeMutation = trpc.whatsapp.closeConversation.useMutation({
    onSuccess: () => {
      toast.success("Conversa encerrada");
      utils.whatsapp.getConversation.invalidate({ id: conversationId });
      utils.whatsapp.listConversations.invalidate();
    },
    onError: (err) => {
      toast.error("Erro ao encerrar conversa", { description: err.message });
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;
    replyMutation.mutate({ conversationId, message: replyText.trim() });
  }

  function formatTime(date: Date | string) {
    return new Date(date).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatFullDate(date: Date | string) {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (convLoading || msgsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!conversation) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-muted-foreground mb-4">Conversa não encontrada.</p>
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard/whatsapp/conversations")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-border/50 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/whatsapp/conversations")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-green-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-lg font-bold text-foreground truncate">
                {conversation.customerName || conversation.phone}
              </h1>
              <Badge
                variant={conversation.status === "open" ? "default" : "secondary"}
                className="text-[10px] px-1.5 py-0"
              >
                {conversation.status === "open" ? "Aberta" : "Fechada"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {conversation.phone}
              {conversation.customerName && (
                <span className="ml-2">
                  • Cliente vinculado
                </span>
              )}
            </p>
          </div>

          {conversation.status === "open" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => closeMutation.mutate({ id: conversationId })}
              disabled={closeMutation.isPending}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Encerrar
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-0">
          {!messages || messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Nenhuma mensagem nesta conversa.
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isInbound = msg.direction === "inbound";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isInbound ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        isInbound
                          ? "bg-muted/60 text-foreground rounded-bl-md"
                          : "bg-primary text-primary-foreground rounded-br-md"
                      }`}
                    >
                      {/* Direction indicator */}
                      <div className="flex items-center gap-1.5 mb-1">
                        {isInbound ? (
                          <User className="w-3 h-3 opacity-60" />
                        ) : (
                          <Bot className="w-3 h-3 opacity-60" />
                        )}
                        <span className="text-[10px] opacity-60 font-medium">
                          {isInbound ? "Cliente" : "Sistema"}
                        </span>
                      </div>

                      {/* Content */}
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.content || "[sem conteúdo]"}
                      </p>

                      {/* Time */}
                      <p
                        className={`text-[10px] mt-1 ${
                          isInbound ? "text-muted-foreground" : "opacity-70"
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                        {msg.status === "failed" && (
                          <span className="ml-1 text-red-500">• Falhou</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Reply Input */}
        {conversation.status === "open" ? (
          <form
            onSubmit={handleSendReply}
            className="flex items-center gap-2 pt-4 border-t border-border/50 shrink-0"
          >
            <Input
              placeholder="Digite uma mensagem..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={replyMutation.isPending}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!replyText.trim() || replyMutation.isPending}
              size="icon"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {replyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        ) : (
          <div className="pt-4 border-t border-border/50 text-center text-sm text-muted-foreground shrink-0">
            Esta conversa foi encerrada em {formatFullDate(conversation.updatedAt)}.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
