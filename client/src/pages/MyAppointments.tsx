/**
 * MyAppointments — Página pública "/meus-agendamentos"
 *
 * O cliente informa o slug do estabelecimento e seu telefone,
 * e visualiza todos os seus agendamentos (pendentes/confirmados).
 *
 * Mobile-first, visual consistente com PublicBooking e PublicAppointmentManage.
 */

import { useState, useCallback } from "react";
import { Link, useSearch } from "wouter";
import {
  Loader2,
  Search,
  Calendar,
  Clock,
  Scissors,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  CalendarPlus,
  Phone,
  Store,
  ChevronRight,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================

interface AppointmentItem {
  id: number;
  date: string;
  endDate: string;
  durationMinutes: number;
  price: string;
  status: string;
  professionalName: string;
  serviceName: string;
  manageToken: string | null;
}

interface HistoryResponse {
  establishment: {
    name: string;
    slug: string;
  };
  appointments: AppointmentItem[];
}

// ============================================================
// HELPERS
// ============================================================

const STATUS_CONFIG: Record<
  string,
  { label: string; bgColor: string; textColor: string; Icon: any }
> = {
  confirmed: {
    label: "Confirmado",
    bgColor: "#dcfce7",
    textColor: "#15803d",
    Icon: CheckCircle2,
  },
  pending: {
    label: "Pendente",
    bgColor: "#fef9c3",
    textColor: "#a16207",
    Icon: Clock,
  },
  cancelled: {
    label: "Cancelado",
    bgColor: "#fee2e2",
    textColor: "#b91c1c",
    Icon: XCircle,
  },
  completed: {
    label: "Concluído",
    bgColor: "#dbeafe",
    textColor: "#1d4ed8",
    Icon: CheckCircle2,
  },
  no_show: {
    label: "Não compareceu",
    bgColor: "#f3f4f6",
    textColor: "#6b7280",
    Icon: AlertCircle,
  },
};

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (isNaN(num) || num === 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return {
    dateShort: date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    dateFull: date.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }),
    time: date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7)
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

// ============================================================
// COMPONENT
// ============================================================

export default function MyAppointments() {
  // Read slug from query string if provided (e.g., /meus-agendamentos?slug=salao-01)
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const initialSlug = urlParams.get("slug") || "";

  const [slug, setSlug] = useState(initialSlug);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const phoneDigits = phone.replace(/\D/g, "");
  const canSearch = slug.trim().length >= 2 && phoneDigits.length >= 10;

  const handleSearch = useCallback(async () => {
    if (!canSearch) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSearched(true);

    try {
      const params = new URLSearchParams({
        slug: slug.trim(),
        phone: phoneDigits,
      });

      const response = await fetch(
        `/api/public/appointments/history?${params.toString()}`
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(
          errData?.error || "Não foi possível buscar os agendamentos."
        );
      }

      const data: HistoryResponse = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Erro ao buscar agendamentos.");
    } finally {
      setLoading(false);
    }
  }, [slug, phoneDigits, canSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canSearch && !loading) {
      handleSearch();
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg">
            <Calendar className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Meus Agendamentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Informe o nome do salão e seu telefone para ver seus agendamentos.
          </p>
        </div>

        {/* Search Form */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
          {/* Slug field */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-muted-foreground" />
              Identificador do salão
            </label>
            <input
              type="text"
              placeholder="Ex: salao-01, barbearia-centro"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
            />
            <p className="text-xs text-muted-foreground">
              O identificador está no link de agendamento do salão.
            </p>
          </div>

          {/* Phone field */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              Seu telefone
            </label>
            <input
              type="tel"
              placeholder="(11) 98888-7777"
              value={phone}
              onChange={(e) => setPhone(applyPhoneMask(e.target.value))}
              onKeyDown={handleKeyDown}
              maxLength={15}
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
            />
          </div>

          {/* Search button */}
          <button
            onClick={handleSearch}
            disabled={!canSearch || loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Buscar agendamentos
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Erro na busca
              </p>
              <p className="text-sm text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Establishment header */}
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Store className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {result.establishment.name}
              </span>
            </div>

            {/* Empty state */}
            {result.appointments.length === 0 && (
              <div className="text-center py-10 space-y-3">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">
                  Nenhum agendamento encontrado
                </p>
                <p className="text-xs text-muted-foreground">
                  Não encontramos agendamentos ativos para este telefone.
                </p>
                <Link
                  href={`/agendar/${result.establishment.slug}`}
                >
                  <button className="mt-3 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 transition-colors inline-flex items-center gap-2 shadow-md">
                    <CalendarPlus className="w-4 h-4" />
                    Agendar agora
                  </button>
                </Link>
              </div>
            )}

            {/* Appointment cards */}
            {result.appointments.map((appt) => {
              const status =
                STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;
              const StatusIcon = status.Icon;
              const { dateFull, time } = formatDateTime(appt.date);

              return (
                <div
                  key={appt.id}
                  className="rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Status bar */}
                  <div
                    className="px-4 py-2 flex items-center justify-between"
                    style={{ backgroundColor: status.bgColor }}
                  >
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: status.textColor }}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {status.label}
                    </span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: status.textColor }}
                    >
                      #{appt.id}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    {/* Service + Price */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <Scissors className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {appt.serviceName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {appt.durationMinutes} min
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-foreground whitespace-nowrap">
                        {formatPrice(appt.price)}
                      </span>
                    </div>

                    {/* Professional */}
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm text-foreground">
                        {appt.professionalName}
                      </p>
                    </div>

                    {/* Date + Time */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <p className="text-sm text-foreground capitalize">
                          {dateFull}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <p className="text-sm font-medium text-foreground">
                          {time}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action footer */}
                  {appt.manageToken && (
                    <Link href={`/agendamento/${appt.manageToken}`}>
                      <div className="px-4 py-2.5 border-t border-border flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
                        <span className="text-xs font-medium text-amber-700">
                          Ver detalhes
                        </span>
                        <ChevronRight className="w-4 h-4 text-amber-700" />
                      </div>
                    </Link>
                  )}
                </div>
              );
            })}

            {/* New booking CTA */}
            {result.appointments.length > 0 && (
              <Link
                href={`/agendar/${result.establishment.slug}`}
              >
                <button className="w-full py-3 rounded-xl border border-border text-sm font-medium text-foreground bg-card hover:bg-muted transition-colors flex items-center justify-center gap-2">
                  <CalendarPlus className="w-4 h-4" />
                  Fazer novo agendamento
                </button>
              </Link>
            )}
          </div>
        )}

        {/* Searched but no result yet (initial state) */}
        {!searched && !result && !error && (
          <div className="text-center py-6 text-xs text-muted-foreground">
            Informe os dados acima para consultar seus agendamentos.
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-2 pb-6 text-xs text-muted-foreground">
          Agendamento online por{" "}
          <span className="font-medium">Prontei</span>
        </div>
      </div>
    </div>
  );
}
