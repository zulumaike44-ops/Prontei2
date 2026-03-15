import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Scissors,
  User,
  AlertTriangle,
  ChevronLeft,
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
      // Reload appointment data
      const updated = await fetch(`/api/public/appointments/${token}`).then((r) => r.json());
      setAppointment(updated);
      setShowCancelConfirm(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar agendamento.");
    } finally {
      setCancelling(false);
    }
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(price));
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      time: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "confirmed":
        return { label: "Confirmado", color: "text-green-700 bg-green-100", icon: CheckCircle2 };
      case "pending":
        return { label: "Pendente", color: "text-yellow-700 bg-yellow-100", icon: Clock };
      case "cancelled":
        return { label: "Cancelado", color: "text-red-700 bg-red-100", icon: XCircle };
      case "completed":
        return { label: "Concluído", color: "text-blue-700 bg-blue-100", icon: CheckCircle2 };
      default:
        return { label: status, color: "text-gray-700 bg-gray-100", icon: Clock };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-xl font-bold mb-2">Agendamento não encontrado</h2>
            <p className="text-muted-foreground">
              Verifique se o link está correto ou entre em contato com o estabelecimento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusInfo(appointment.status);
  const StatusIcon = statusInfo.icon;
  const { date: formattedDate, time: formattedTime } = formatDateTime(appointment.date);
  const canCancel = ["pending", "confirmed"].includes(appointment.status) && new Date(appointment.date).getTime() > Date.now();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="font-bold text-lg">{appointment.establishmentName}</h1>
          <p className="text-xs text-muted-foreground">Detalhes do agendamento</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Status Badge */}
        <div className="flex items-center justify-center mb-6">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${statusInfo.color}`}>
            <StatusIcon className="w-4 h-4" />
            {statusInfo.label}
          </div>
        </div>

        {/* Appointment Details */}
        <Card className="mb-4">
          <CardContent className="pt-6 pb-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Scissors className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-medium">{appointment.serviceName}</div>
                <div className="text-xs text-muted-foreground">{appointment.durationMinutes} minutos</div>
              </div>
              <div className="ml-auto font-bold text-primary">{formatPrice(appointment.price)}</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-medium">{appointment.professionalName}</div>
                <div className="text-xs text-muted-foreground">Profissional</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-medium capitalize">{formattedDate}</div>
                <div className="text-xs text-muted-foreground">Data</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-medium">{formattedTime}</div>
                <div className="text-xs text-muted-foreground">Horário</div>
              </div>
            </div>

            {appointment.notes && (
              <div className="bg-muted/50 rounded-md p-3 text-sm text-muted-foreground">
                <strong>Observações:</strong> {appointment.notes}
              </div>
            )}

            {appointment.cancellationReason && (
              <div className="bg-red-50 rounded-md p-3 text-sm text-red-700">
                <strong>Motivo do cancelamento:</strong> {appointment.cancellationReason}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {canCancel && !showCancelConfirm && (
          <div className="space-y-2">
            <Link href={`/agendar/${appointment.establishmentSlug}`}>
              <Button variant="outline" className="w-full">
                Fazer novo agendamento
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setShowCancelConfirm(true)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancelar agendamento
            </Button>
          </div>
        )}

        {/* Cancel Confirmation */}
        {showCancelConfirm && (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-red-800">Cancelar agendamento?</h3>
              </div>
              <p className="text-sm text-red-700 mb-3">
                Tem certeza que deseja cancelar? Esta ação não pode ser desfeita.
              </p>
              <div className="mb-3">
                <Label className="text-sm text-red-700">Motivo (opcional)</Label>
                <Textarea
                  placeholder="Por que está cancelando?"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  Manter agendamento
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    "Sim, cancelar"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already cancelled/completed */}
        {!canCancel && appointment.status !== "cancelled" && (
          <Link href={`/agendar/${appointment.establishmentSlug}`}>
            <Button variant="outline" className="w-full">
              Fazer novo agendamento
            </Button>
          </Link>
        )}

        {appointment.status === "cancelled" && (
          <Link href={`/agendar/${appointment.establishmentSlug}`}>
            <Button className="w-full">
              Reagendar
            </Button>
          </Link>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-muted-foreground">
        Agendamento online por <span className="font-medium">Prontei</span>
      </div>
    </div>
  );
}
