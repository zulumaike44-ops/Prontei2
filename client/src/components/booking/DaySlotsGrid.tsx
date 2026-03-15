/**
 * DaySlotsGrid — Grade de horários disponíveis para o dia selecionado
 *
 * Exibe chips de horário em grid responsivo.
 * Busca dados da API quando date/professionalId/serviceId mudam.
 */

import { Clock, AlertCircle } from "lucide-react";
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
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Carregando horários para {dateLabel}...
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive p-3 rounded-lg bg-destructive/10">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const availableSlots = slots.filter((s) => s.available);

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>Nenhum horário disponível para {dateLabel}.</p>
        <p className="text-xs mt-1">Tente outra data ou profissional.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          Horários em {dateLabel}
        </span>
        <span className="text-xs text-muted-foreground">
          {availableSlots.length} disponíveis
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {availableSlots.map((slot) => {
          const isSelected = slot.time === selectedTime;
          return (
            <button
              key={slot.time}
              onClick={() => onSelectTime(slot.time)}
              className={`py-2.5 px-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                isSelected
                  ? "text-white shadow-sm"
                  : "border-border bg-card hover:border-muted-foreground/30 text-foreground"
              }`}
              style={
                isSelected
                  ? {
                      backgroundColor: primaryColor,
                      borderColor: primaryColor,
                    }
                  : undefined
              }
            >
              {slot.time}
            </button>
          );
        })}
      </div>
    </div>
  );
}
