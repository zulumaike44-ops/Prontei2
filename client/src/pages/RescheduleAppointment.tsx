/**
 * RescheduleAppointment — Página pública de reagendamento
 *
 * O cliente acessa via /reagendar/:token e pode escolher nova data/hora
 * para o agendamento existente. Reutiliza BookingCalendar e DaySlotsGrid.
 * Mobile-first, visual consistente com PublicBooking e PublicAppointmentManage.
 */

import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import {
  Loader2,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Scissors,
  User,
  Calendar,
  Clock,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import { DaySlotsGrid } from "@/components/booking/DaySlotsGrid";

// ============================================================
// TYPES
// ============================================================

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

interface BookingData {
  establishment: {
    id: number;
    name: string;
    slug: string;
    phone: string | null;
    address: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
  };
  services: any[];
  professionals: any[];
}

interface RescheduleResult {
  success: boolean;
  appointment: {
    id: number;
    date: string;
    time: string;
    professionalName: string;
    serviceName: string;
    durationMinutes: number;
    price: string;
    status: string;
  };
  message: string;
}

// ============================================================
// HELPERS
// ============================================================

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

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function getWeekdayName(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("pt-BR", { weekday: "long" });
}

// ============================================================
// COMPONENT
// ============================================================

export default function RescheduleAppointment() {
  const [, params] = useRoute("/reagendar/:token");
  const token = params?.token ?? "";

  // Data states
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection states
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RescheduleResult | null>(null);

  const primaryColor = bookingData?.establishment?.primaryColor || "#8B4513";

  // ============================================================
  // FETCH APPOINTMENT + BOOKING DATA
  // ============================================================

  useEffect(() => {
    if (!token) return;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch appointment data
        const apptRes = await fetch(`/api/public/appointments/${token}`);
        if (!apptRes.ok) throw new Error("Agendamento não encontrado.");
        const apptData: AppointmentData = await apptRes.json();

        if (!["pending", "confirmed"].includes(apptData.status)) {
          throw new Error("Este agendamento não pode ser reagendado.");
        }

        if (new Date(apptData.date).getTime() < Date.now()) {
          throw new Error("Não é possível reagendar um agendamento que já passou.");
        }

        setAppointment(apptData);

        // Fetch booking page data for the establishment (to get colors)
        if (apptData.establishmentSlug) {
          try {
            const bookingRes = await fetch(`/api/public/booking/${apptData.establishmentSlug}`);
            if (bookingRes.ok) {
              const bData = await bookingRes.json();
              setBookingData(bData);
            }
          } catch {
            // Non-critical, continue without booking data
          }
        }
      } catch (err: any) {
        setError(err.message || "Erro ao carregar agendamento.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token]);

  // ============================================================
  // HANDLE RESCHEDULE
  // ============================================================

  async function handleReschedule() {
    if (!token || !selectedDate || !selectedTime || !appointment) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/appointments/${token}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          professionalId: appointment.professionalId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao reagendar.");
      }

      const data: RescheduleResult = await res.json();
      setResult(data);
      toast.success("Agendamento reagendado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao reagendar agendamento.");
    } finally {
      setSubmitting(false);
    }
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Carregando agendamento...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-bold text-foreground">
            {error || "Agendamento não encontrado"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Verifique se o link está correto ou entre em contato com o estabelecimento.
          </p>
          {appointment?.establishmentSlug && (
            <Link
              href={`/agendar/${appointment.establishmentSlug}`}
              className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
              style={{ color: primaryColor }}
            >
              Fazer novo agendamento
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // SUCCESS — Reagendamento confirmado
  // ============================================================

  if (result) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto px-4 py-8 space-y-5">
          {/* Success icon */}
          <div className="flex justify-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <CheckCircle2 className="w-10 h-10" style={{ color: primaryColor }} />
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">Reagendamento confirmado!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Seu horário foi atualizado com sucesso.
            </p>
          </div>

          {/* New appointment details */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground mb-2">Novo horário</h3>

            <div className="flex items-start gap-3">
              <Scissors className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{result.appointment.serviceName}</p>
                <p className="text-xs text-muted-foreground">{result.appointment.durationMinutes} minutos</p>
              </div>
              <span className="text-sm font-bold" style={{ color: primaryColor }}>
                {formatPrice(result.appointment.price)}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-foreground">{result.appointment.professionalName}</p>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-foreground capitalize">
                {getWeekdayName(result.appointment.date)}, {formatDateBR(result.appointment.date)}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-foreground">{result.appointment.time}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Link href={`/agendamento/${token}`}>
              <button
                className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                Ver detalhes do agendamento
              </button>
            </Link>
            <Link href={`/agendar/${appointment.establishmentSlug}`}>
              <button className="w-full py-3 rounded-xl border border-border text-sm font-medium text-foreground bg-card hover:bg-muted transition-colors flex items-center justify-center gap-2">
                Fazer novo agendamento
              </button>
            </Link>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 pb-6 text-xs text-muted-foreground">
            Agendamento online por <span className="font-medium">Prontei</span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN — Seleção de nova data/hora
  // ============================================================

  const { date: currentDate, time: currentTime } = formatDateTime(appointment.date);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-5 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/agendamento/${token}`}>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground">Reagendar</h1>
            <p className="text-xs text-muted-foreground">{appointment.establishmentName}</p>
          </div>
        </div>

        {/* Current appointment info */}
        <div
          className="rounded-xl border p-4 space-y-2"
          style={{ borderColor: `${primaryColor}30`, backgroundColor: `${primaryColor}05` }}
        >
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className="w-4 h-4" style={{ color: primaryColor }} />
            <span className="text-sm font-semibold text-foreground">Agendamento atual</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Serviço</span>
              <p className="font-medium text-foreground">{appointment.serviceName}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Profissional</span>
              <p className="font-medium text-foreground">{appointment.professionalName}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Data</span>
              <p className="font-medium text-foreground capitalize">{currentDate}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Horário</span>
              <p className="font-medium text-foreground">{currentTime}</p>
            </div>
          </div>
        </div>

        {/* Divider with arrow */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Escolha o novo horário</span>
          </div>
        </div>

        {/* Calendar */}
        <BookingCalendar
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setSelectedTime(null);
          }}
          slug={appointment.establishmentSlug}
          professionalId={appointment.professionalId}
          serviceId={appointment.serviceId}
          primaryColor={primaryColor}
        />

        {/* Time slots */}
        {selectedDate && (
          <DaySlotsGrid
            slug={appointment.establishmentSlug}
            professionalId={appointment.professionalId}
            serviceId={appointment.serviceId}
            date={selectedDate}
            selectedTime={selectedTime}
            onSelectTime={setSelectedTime}
            primaryColor={primaryColor}
          />
        )}

        {/* Confirmation section */}
        {selectedDate && selectedTime && (
          <div className="space-y-3">
            {/* Summary of change */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Resumo da alteração</h3>

              <div className="flex items-center gap-3 text-sm">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">De</p>
                  <p className="text-foreground line-through opacity-60">
                    {currentDate} às {currentTime}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Para</p>
                  <p className="font-semibold" style={{ color: primaryColor }}>
                    <span className="capitalize">{getWeekdayName(selectedDate)}</span>,{" "}
                    {formatDateBR(selectedDate)} às {selectedTime}
                  </p>
                </div>
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleReschedule}
              disabled={submitting}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-70 flex items-center justify-center gap-2 shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reagendando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar reagendamento
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 pb-6 text-xs text-muted-foreground">
          Agendamento online por <span className="font-medium">Prontei</span>
        </div>
      </div>
    </div>
  );
}
