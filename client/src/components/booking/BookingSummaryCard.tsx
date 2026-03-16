/**
 * BookingSummaryCard — Resumo do agendamento antes de confirmar
 *
 * Exibe serviço, profissional, data, hora, preço, dados do cliente.
 * Botão de confirmação com loading state.
 * Visual premium com animações.
 */

import {
  Scissors,
  User,
  Calendar,
  Clock,
  DollarSign,
  ChevronLeft,
  Loader2,
  ShieldCheck,
  Phone,
  MessageSquare,
} from "lucide-react";

interface BookingSummaryCardProps {
  serviceName: string;
  professionalName: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  durationMinutes: number;
  price: string;
  customerName: string;
  customerPhone: string;
  notes: string;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
  primaryColor: string;
}

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (isNaN(num) || num === 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
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

function formatPhoneBR(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function BookingSummaryCard({
  serviceName,
  professionalName,
  date,
  time,
  durationMinutes,
  price,
  customerName,
  customerPhone,
  notes,
  onConfirm,
  onBack,
  loading,
  primaryColor,
}: BookingSummaryCardProps) {
  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="text-center animate-fade-in-up">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ backgroundColor: `${primaryColor}15` }}
        >
          <ShieldCheck className="w-6 h-6" style={{ color: primaryColor }} />
        </div>
        <h3 className="text-lg font-bold text-foreground">Confirme seu agendamento</h3>
        <p className="text-xs text-muted-foreground mt-1">Revise os detalhes antes de confirmar</p>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm animate-fade-in-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
        {/* Service & Professional */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: `${primaryColor}12` }}
            >
              <Scissors className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{serviceName}</p>
              <p className="text-xs text-muted-foreground">{durationMinutes} minutos</p>
            </div>
            <span className="text-base font-bold flex-shrink-0" style={{ color: primaryColor }}>
              {formatPrice(price)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${primaryColor}12` }}
            >
              <User className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <p className="text-sm font-medium text-foreground">{professionalName}</p>
          </div>
        </div>

        {/* Date & Time */}
        <div className="border-t border-border p-4 space-y-3" style={{ backgroundColor: `${primaryColor}04` }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${primaryColor}12` }}
            >
              <Calendar className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <p className="text-sm font-medium text-foreground capitalize">
              {getWeekdayName(date)}, {formatDateBR(date)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${primaryColor}12` }}
            >
              <Clock className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <p className="text-sm font-bold text-foreground">{time}</p>
          </div>
        </div>

        {/* Customer info */}
        <div className="border-t border-border p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seus dados</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">{customerName}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted">
              <Phone className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">{formatPhoneBR(customerPhone)}</p>
          </div>
          {notes && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted mt-0.5">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground italic leading-relaxed">"{notes}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: "0.2s", opacity: 0 }}>
        <button
          onClick={onBack}
          disabled={loading}
          className="flex-1 py-3.5 rounded-xl border border-border text-sm font-medium text-foreground bg-card hover:bg-muted transition-all tap-feedback disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4 inline mr-1" /> Voltar
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-[2] py-3.5 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all btn-press disabled:opacity-70 flex items-center justify-center gap-2"
          style={{ backgroundColor: primaryColor }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Confirmando...
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              Confirmar agendamento
            </>
          )}
        </button>
      </div>
    </div>
  );
}
