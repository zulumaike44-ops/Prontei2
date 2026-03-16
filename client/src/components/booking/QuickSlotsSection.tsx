/**
 * QuickSlotsSection — Melhores horários de hoje e amanhã
 *
 * Exibe chips rápidos para agendamento imediato.
 * Aparece após selecionar serviço e profissional.
 * Inclui skeleton loading sofisticado e animações.
 */

import { Zap, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface QuickSlot {
  date: string;
  dateLabel: string;
  time: string;
  professionalId: number;
  professionalName: string;
}

interface QuickSlotsSectionProps {
  slug: string;
  serviceId: number;
  professionalId: number | null;
  onSelectSlot: (date: string, time: string, professionalId: number) => void;
  primaryColor: string;
}

export function QuickSlotsSection({
  slug,
  serviceId,
  professionalId,
  onSelectSlot,
  primaryColor,
}: QuickSlotsSectionProps) {
  const [todaySlots, setTodaySlots] = useState<QuickSlot[]>([]);
  const [tomorrowSlots, setTomorrowSlots] = useState<QuickSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchQuickSlots() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          slug,
          serviceId: String(serviceId),
        });
        if (professionalId) {
          params.set("professionalId", String(professionalId));
        }

        const res = await fetch(`/api/public/quickslots?${params}`);
        if (!res.ok) throw new Error("Erro ao buscar horários rápidos");

        const data = await res.json();
        if (!cancelled) {
          setTodaySlots(data.today || []);
          setTomorrowSlots(data.tomorrow || []);
        }
      } catch (err) {
        console.error("[QuickSlots] Error:", err);
        if (!cancelled) {
          setTodaySlots([]);
          setTomorrowSlots([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchQuickSlots();
    return () => { cancelled = true; };
  }, [slug, serviceId, professionalId]);

  if (loading) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-card p-4 animate-fade-in-up">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Zap className="w-4 h-4 animate-pulse" style={{ color: primaryColor }} />
          <span>Buscando horários rápidos...</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-9 rounded-lg skeleton-shine"
              style={{ width: `${60 + i * 8}px` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const hasSlots = todaySlots.length > 0 || tomorrowSlots.length > 0;

  if (!hasSlots) return null;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 animate-fade-in-scale shadow-sm">
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${primaryColor}15` }}
        >
          <Zap className="w-3.5 h-3.5" style={{ color: primaryColor }} />
        </div>
        <span className="text-sm font-bold text-foreground">Horários rápidos</span>
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-medium">
          Agende em 1 toque
        </span>
      </div>

      {todaySlots.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Hoje
          </p>
          <div className="flex gap-2 flex-wrap">
            {todaySlots.map((slot, i) => (
              <button
                key={`today-${i}`}
                onClick={() => onSelectSlot(slot.date, slot.time, slot.professionalId)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold border bg-background hover:shadow-md transition-all duration-200 tap-feedback animate-fade-in-up"
                style={{
                  borderColor: `${primaryColor}30`,
                  animationDelay: `${i * 0.05}s`,
                }}
              >
                <Clock className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                <span>{slot.time}</span>
                {!professionalId && (
                  <span className="text-[10px] text-muted-foreground ml-0.5">
                    {slot.professionalName.split(" ")[0]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {tomorrowSlots.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Amanhã
          </p>
          <div className="flex gap-2 flex-wrap">
            {tomorrowSlots.map((slot, i) => (
              <button
                key={`tomorrow-${i}`}
                onClick={() => onSelectSlot(slot.date, slot.time, slot.professionalId)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold border bg-background hover:shadow-md transition-all duration-200 tap-feedback animate-fade-in-up"
                style={{
                  borderColor: `${primaryColor}30`,
                  animationDelay: `${i * 0.05}s`,
                }}
              >
                <Clock className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                <span>{slot.time}</span>
                {!professionalId && (
                  <span className="text-[10px] text-muted-foreground ml-0.5">
                    {slot.professionalName.split(" ")[0]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
