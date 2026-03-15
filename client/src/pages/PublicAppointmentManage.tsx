/**
 * PublicAppointmentManage — Página pública de gerenciamento de agendamento
 *
 * Permite visualizar detalhes, cancelar e reagendar.
 * Mobile-first, visual consistente com a página de booking.
 */

import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Scissors,
  User,
  AlertTriangle,
  CalendarPlus,
  AlertCircle,
  DollarSign,
  MessageSquare,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";

interface AppointmentData {
  id: number;
  status: string;
  date: string;
  endDate: string;
  durationMinutes: number;
  price: string;
  notes: string | null;
  source: string;
  professionalName: string;
  professionalId: number;
  serviceName: string;
  serviceId: number;
  establishmentName: string;
  establishmentSlug: string;
  establishmentPhone: string | null;
  manageToken: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

const STATUS_MAP: Record<string, { label: string; bgColor: string; textColor: string; Icon: any }> = {
  confirmed: { label: "Confirmado", bgColor: "#dcfce7", textColor: "#15803d", Icon: CheckCircle2 },
  pending: { label: "Pendente", bgColor: "#fef9c3", textColor: "#a16207", Icon: Clock },
  cancelled: { label: "Cancelado", bgColor: "#fee2e2", textColor: "#b91c1c", Icon: XCircle },
  completed: { label: "Concluído", bgColor: "#dbeafe", textColor: "#1d4ed8", Icon: CheckCircle2 },
  no_show: { label: "Não compareceu", bgColor: "#f3f4f6", textColor: "#6b7280", Icon: AlertCircle },
};

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (isNaN(num) || num === 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return {
    date: date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function PublicAppointmentManage() {
  const [, params] = useRoute("/agendamento/:token");
  const token = params?.token ?? "";

  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancel state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/public/appointments/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Agendamento não encontrado");
        return r.json();
      })
      .then((data) => {
        setAppointment(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const handleCancel = async () => {
    if (!token) return;
    setCancelling(true);
    try {
      const r = await fetch(`/api/public/appointments/${token}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Erro ao cancelar.");
      }
      toast.success("Agendamento cancelado com sucesso.");
      const updated = await fetch(`/api/public/appointments/${token}`).then((r) => r.json());
      setAppointment(updated);
      setShowCancelConfirm(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar agendamento.");
    } finally {
      setCancelling(false);
    }
  };

  // ============================================================
  // LOADING / ERROR
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-bold text-foreground">Agendamento não encontrado</h2>
          <p className="text-sm text-muted-foreground">
            Verifique se o link está correto ou entre em contato com o estabelecimento.
          </p>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[appointment.status] || STATUS_MAP.pending;
  const StatusIcon = statusInfo.Icon;
  const { date: formattedDate, time: formattedTime } = formatDateTime(appointment.date);
  const canCancel =
    ["pending", "confirmed"].includes(appointment.status) &&
    new Date(appointment.date).getTime() > Date.now();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-5 space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-lg font-bold text-foreground">{appointment.establishmentName}</h1>
          <p className="text-xs text-muted-foreground">Detalhes do agendamento</p>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
            style={{
              backgroundColor: statusInfo.bgColor,
              color: statusInfo.textColor,
            }}
          >
            <StatusIcon className="w-4 h-4" />
            {statusInfo.label}
          </span>
        </div>

        {/* Appointment Details Card */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Scissors className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{appointment.serviceName}</p>
              <p className="text-xs text-muted-foreground">{appointment.durationMinutes} minutos</p>
            </div>
            <span className="text-sm font-bold text-foreground">
              {formatPrice(appointment.price)}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <User className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-foreground">{appointment.professionalName}</p>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-foreground capitalize">{formattedDate}</p>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-foreground">{formattedTime}</p>
          </div>

          {appointment.notes && (
            <div className="flex items-start gap-3 pt-2 border-t border-border">
              <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground italic">"{appointment.notes}"</p>
            </div>
          )}

          {appointment.cancellationReason && (
            <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: "#fee2e2", color: "#b91c1c" }}>
              <strong>Motivo do cancelamento:</strong> {appointment.cancellationReason}
            </div>
          )}
        </div>

        {/* Actions */}
        {canCancel && !showCancelConfirm && (
          <div className="space-y-2">
            <Link href={`/reagendar/${appointment.manageToken}`}>
              <button className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2 shadow-md bg-amber-700">
                <CalendarClock className="w-4 h-4" />
                Reagendar
              </button>
            </Link>
            <Link href={`/agendar/${appointment.establishmentSlug}`}>
              <button className="w-full py-3 rounded-xl border border-border text-sm font-medium text-foreground bg-card hover:bg-muted transition-colors flex items-center justify-center gap-2">
                <CalendarPlus className="w-4 h-4" />
                Fazer novo agendamento
              </button>
            </Link>
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Cancelar agendamento
            </button>
          </div>
        )}

        {/* Cancel Confirmation */}
        {showCancelConfirm && (
          <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-red-800 text-sm">Cancelar agendamento?</h3>
            </div>
            <p className="text-sm text-red-700">
              Tem certeza que deseja cancelar? Esta ação não pode ser desfeita.
            </p>
            <div>
              <label className="text-sm font-medium text-red-700 mb-1 block">
                Motivo (opcional)
              </label>
              <textarea
                placeholder="Por que está cancelando?"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground bg-white hover:bg-muted transition-colors"
              >
                Manter
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  "Sim, cancelar"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Already cancelled → Reagendar */}
        {appointment.status === "cancelled" && (
          <Link href={`/agendar/${appointment.establishmentSlug}`}>
            <button className="w-full py-3 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-md">
              <CalendarPlus className="w-4 h-4" />
              Reagendar
            </button>
          </Link>
        )}

        {/* Completed or no_show → New booking */}
        {!canCancel && appointment.status !== "cancelled" && (
          <Link href={`/agendar/${appointment.establishmentSlug}`}>
            <button className="w-full py-3 rounded-xl border border-border text-sm font-medium text-foreground bg-card hover:bg-muted transition-colors flex items-center justify-center gap-2">
              <CalendarPlus className="w-4 h-4" />
              Fazer novo agendamento
            </button>
          </Link>
        )}

        {/* Footer */}
        <div className="text-center pt-4 pb-6 text-xs text-muted-foreground">
          Agendamento online por <span className="font-medium">Prontei</span>
        </div>
      </div>
    </div>
  );
}
