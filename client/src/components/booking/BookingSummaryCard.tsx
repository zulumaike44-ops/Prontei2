/**
 * BookingSummaryCard — Resumo do agendamento antes de confirmar
 *
 * Exibe todos os dados selecionados e botão de confirmação.
 */

import { Calendar, Clock, User, Scissors, DollarSign, Loader2 } from "lucide-react";

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

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const dayName = dayNames[date.getDay()];
  return `${dayName}, ${d}/${m}/${y}`;
}

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (isNaN(num) || num === 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
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
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base font-semibold text-foreground">Confirme seu agendamento</span>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Scissors className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{serviceName}</p>
            <p className="text-xs text-muted-foreground">{durationMinutes} min</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <User className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-foreground">{professionalName}</p>
        </div>

        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-foreground">{formatDateBR(date)}</p>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-foreground">{time}</p>
        </div>

        <div className="flex items-start gap-3">
          <DollarSign className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <p className="text-sm font-semibold" style={{ color: primaryColor }}>
            {formatPrice(price)}
          </p>
        </div>

        <hr className="border-border" />

        <div className="text-sm text-foreground">
          <p className="font-medium">{customerName}</p>
          <p className="text-muted-foreground text-xs">{formatPhoneBR(customerPhone)}</p>
          {notes && (
            <p className="text-xs text-muted-foreground mt-1 italic">"{notes}"</p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-foreground bg-card hover:bg-muted transition-colors disabled:opacity-50"
        >
          Voltar
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-3 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
          style={{ backgroundColor: primaryColor }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Agendando...
            </>
          ) : (
            "Confirmar agendamento"
          )}
        </button>
      </div>
    </div>
  );
}
