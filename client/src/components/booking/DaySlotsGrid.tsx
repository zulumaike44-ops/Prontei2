/**
 * DaySlotsGrid — Grade de horários disponíveis para o dia selecionado
 *
 * Exibe chips de horário em grid responsivo.
 * Busca dados da API quando date/professionalId/serviceId mudam.
 * Inclui skeleton loading sofisticado e animações staggered.
 */

import { Clock, AlertCircle, CalendarX } from "lucide-react";
import { useEffect, useState } from "react";

interface DaySlotsGridProps {
  slug: string;
  professionalId: number;
  serviceId: number;
  date: string;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  primaryColor: string;
  onAvailabilityLoaded?: (durationMinutes: number, effectivePrice: string) => void;
}

interface SlotData {
  time: string;
  available: boolean;
}

export function DaySlotsGrid({
  slug,
  professionalId,
  serviceId,
  date,
  selectedTime,
  onSelectTime,
  primaryColor,
  onAvailabilityLoaded,
}: DaySlotsGridProps) {
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSlots() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          slug,
          professionalId: String(professionalId),
          serviceId: String(serviceId),
          date,
        });
        const res = await fetch(`/api/public/availability?${params}`);
        if (!res.ok) throw new Error("Erro ao buscar horários");

        const data = await res.json();
        if (!cancelled) {
          const slotList: SlotData[] = (data.slots || []).map((s: any) => ({
            time: s.time ?? s.start,
            available: s.available !== false,
          }));
          setSlots(slotList);

          if (onAvailabilityLoaded && data.durationMinutes) {
            onAvailabilityLoaded(data.durationMinutes, data.effectivePrice ?? "0");
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Erro ao carregar horários");
          setSlots([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSlots();
    return () => { cancelled = true; };
  }, [slug, professionalId, serviceId, date]);

  // Format date for display
  const [y, m, d] = date.split("-");
  const dateLabel = `${d}/${m}/${y}`;

  if (loading) {
    return (
      <div className="space-y-3 animate-fade-in-up">
        <p className="text-sm font-medium text-muted-foreground">
          Carregando horários para {dateLabel}...
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-11 rounded-lg skeleton-shine"
              style={{ animationDelay: `${i * 0.05}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2.5 text-sm text-destructive p-4 rounded-xl bg-destructive/10 animate-fade-in-scale">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span className="font-medium">{error}</span>
      </div>
    );
  }

  const availableSlots = slots.filter((s) => s.available);

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm animate-fade-in-up">
        <CalendarX className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Nenhum horário disponível para {dateLabel}</p>
        <p className="text-xs mt-1.5">Tente outra data ou profissional.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          Horários em {dateLabel}
        </span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
          {availableSlots.length} disponíveis
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {availableSlots.map((slot, index) => {
          const isSelected = slot.time === selectedTime;
          return (
            <button
              key={slot.time}
              onClick={() => onSelectTime(slot.time)}
              className={`py-2.5 px-2 rounded-lg text-sm font-semibold border transition-all duration-150 tap-feedback animate-fade-in-up ${
                isSelected
                  ? "text-white shadow-md"
                  : "border-border bg-card hover:border-muted-foreground/30 text-foreground hover:shadow-sm"
              }`}
              style={{
                animationDelay: `${index * 0.03}s`,
                ...(isSelected
                  ? {
                      backgroundColor: primaryColor,
                      borderColor: primaryColor,
                      boxShadow: `0 4px 12px -2px ${primaryColor}40`,
                    }
                  : {}),
              }}
            >
              {slot.time}
            </button>
          );
        })}
      </div>
    </div>
  );
}
