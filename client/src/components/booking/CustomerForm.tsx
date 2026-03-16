/**
 * CustomerForm — Formulário de dados do cliente
 *
 * Campos: nome, telefone, observações (opcional).
 * Máscara de telefone brasileiro.
 * Auto-lookup: quando o telefone tem 10+ dígitos, busca o cliente no backend.
 * Se encontrado, preenche o nome automaticamente e exibe agendamentos ativos.
 * Animações suaves e feedback visual.
 */

import { User, Phone, MessageSquare, CalendarClock, CheckCircle2, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";

interface ActiveAppointment {
  id: number;
  date: string;
  endDate: string;
  durationMinutes: number;
  price: string;
  status: string;
  professionalName: string;
  serviceName: string;
  manageToken: string;
}

interface CustomerFormProps {
  customerName: string;
  customerPhone: string;
  notes: string;
  onChangeName: (name: string) => void;
  onChangePhone: (phone: string) => void;
  onChangeNotes: (notes: string) => void;
  primaryColor: string;
  slug: string;
  /** Pre-fill from rebook */
  prefillName?: string;
  prefillPhone?: string;
}

function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11;
}

function formatDateTimeBR(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (isNaN(num) || num === 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

export function CustomerForm({
  customerName,
  customerPhone,
  notes,
  onChangeName,
  onChangePhone,
  onChangeNotes,
  primaryColor,
  slug,
  prefillName,
  prefillPhone,
}: CustomerFormProps) {
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  // Lookup state
  const [lookupLoading, setLookupLoading] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [activeAppointments, setActiveAppointments] = useState<ActiveAppointment[]>([]);
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLookedUpPhone = useRef<string>("");

  // Prefill
  useEffect(() => {
    if (prefillName && !customerName) onChangeName(prefillName);
    if (prefillPhone && !customerPhone) onChangePhone(prefillPhone);
  }, [prefillName, prefillPhone]);

  // Auto-lookup when phone has 10+ digits (debounced)
  useEffect(() => {
    const digits = customerPhone.replace(/\D/g, "");

    // Clear previous timer
    if (lookupTimerRef.current) {
      clearTimeout(lookupTimerRef.current);
    }

    // Only lookup when we have a valid phone and it's different from last lookup
    if (digits.length >= 10 && digits !== lastLookedUpPhone.current) {
      lookupTimerRef.current = setTimeout(async () => {
        setLookupLoading(true);
        try {
          const params = new URLSearchParams({ slug, phone: digits });
          const res = await fetch(`/api/public/customer/lookup?${params}`);
          if (!res.ok) throw new Error("Erro na busca");

          const data = await res.json();
          lastLookedUpPhone.current = digits;

          if (data.found && data.customer) {
            setCustomerFound(true);
            // Auto-fill name if empty or if it was auto-filled before
            if (!customerName.trim() || customerFound) {
              onChangeName(data.customer.name);
            }
            setActiveAppointments(data.appointments || []);
          } else {
            setCustomerFound(false);
            setActiveAppointments([]);
          }
        } catch {
          // Silently fail — non-critical
          setCustomerFound(false);
          setActiveAppointments([]);
        } finally {
          setLookupLoading(false);
        }
      }, 600); // 600ms debounce
    } else if (digits.length < 10) {
      setCustomerFound(false);
      setActiveAppointments([]);
      lastLookedUpPhone.current = "";
    }

    return () => {
      if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    };
  }, [customerPhone, slug]);

  const phoneValid = !phoneTouched || isValidPhone(customerPhone);
  const nameValid = !nameTouched || customerName.trim().length >= 2;

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-1">
        <User className="w-4 h-4" style={{ color: primaryColor }} />
        <span className="text-base font-semibold text-foreground">Seus dados</span>
      </div>

      {/* Telefone — PRIMEIRO para permitir auto-lookup */}
      <div className="animate-fade-in-up" style={{ animationDelay: "0.05s", opacity: 0 }}>
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
          Telefone (WhatsApp)
        </label>
        <div className="relative">
          <input
            type="tel"
            value={formatPhoneBR(customerPhone)}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
              onChangePhone(digits);
            }}
            onBlur={() => setPhoneTouched(true)}
            placeholder="(11) 99999-9999"
            className={`w-full px-4 py-3 rounded-xl border text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 ${
              !phoneValid
                ? "border-destructive focus:ring-destructive/30"
                : "border-border focus:ring-primary/30"
            }`}
            style={
              phoneValid
                ? { "--tw-ring-color": `${primaryColor}40` } as any
                : undefined
            }
          />
          {lookupLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {customerFound && !lookupLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-bounce-in">
              <CheckCircle2 className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
          )}
        </div>
        {!phoneValid && (
          <p className="text-xs text-destructive mt-1 animate-fade-in-scale">Informe um telefone válido com DDD.</p>
        )}
        {customerFound && !lookupLoading && (
          <p className="text-xs mt-1 animate-fade-in-scale" style={{ color: primaryColor }}>
            Cliente reconhecido! Nome preenchido automaticamente.
          </p>
        )}
      </div>

      {/* Agendamentos ativos do cliente */}
      {activeAppointments.length > 0 && (
        <div
          className="rounded-xl border p-3.5 space-y-2 animate-fade-in-scale"
          style={{ borderColor: `${primaryColor}30`, backgroundColor: `${primaryColor}05` }}
        >
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4" style={{ color: primaryColor }} />
            <span className="text-sm font-semibold text-foreground">
              Seus agendamentos ativos ({activeAppointments.length})
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Você já tem agendamentos marcados. Pode gerenciá-los ou continuar agendando.
          </p>

          <div className="space-y-2 mt-1">
            {activeAppointments.map((appt) => {
              const { date, time } = formatDateTimeBR(appt.date);
              return (
                <div
                  key={appt.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5 card-lift"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {appt.serviceName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {appt.professionalName} · {date} às {time}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                    <Link href={`/agendamento/${appt.manageToken}`}>
                      <button
                        className="text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80 text-white tap-feedback"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Gerenciar
                      </button>
                    </Link>
                    <Link href={`/reagendar/${appt.manageToken}`}>
                      <button className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-all text-foreground tap-feedback">
                        Reagendar
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Nome */}
      <div className="animate-fade-in-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
          Nome completo
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => onChangeName(e.target.value)}
          onBlur={() => setNameTouched(true)}
          placeholder="Seu nome"
          className={`w-full px-4 py-3 rounded-xl border text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 ${
            !nameValid
              ? "border-destructive focus:ring-destructive/30"
              : "border-border focus:ring-primary/30"
          }`}
          style={
            nameValid
              ? { "--tw-ring-color": `${primaryColor}40` } as any
              : undefined
          }
        />
        {!nameValid && (
          <p className="text-xs text-destructive mt-1 animate-fade-in-scale">Nome deve ter pelo menos 2 caracteres.</p>
        )}
      </div>

      {/* Observações */}
      <div className="animate-fade-in-up" style={{ animationDelay: "0.15s", opacity: 0 }}>
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
          Observações
          <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => onChangeNotes(e.target.value)}
          placeholder="Alguma preferência ou observação?"
          rows={2}
          className="w-full px-4 py-3 rounded-xl border border-border text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 resize-none"
          style={{ "--tw-ring-color": `${primaryColor}40` } as any}
        />
      </div>
    </div>
  );
}

export { isValidPhone };
