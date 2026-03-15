/**
 * QuickSlotsSection — Melhores horários de hoje e amanhã
 *
 * Exibe chips rápidos para agendamento imediato.
 * Aparece após selecionar serviço e profissional.
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
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Zap className="w-4 h-4" />
          <span>Carregando horários rápidos...</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const hasSlots = todaySlots.length > 0 || tomorrowSlots.length > 0;

  if (!hasSlots) return null;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4" style={{ color: primaryColor }} />
        <span className="text-sm font-semibold text-foreground">Horários rápidos</span>
      </div>

      {todaySlots.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Hoje</p>
          <div className="flex gap-2 flex-wrap">
            {todaySlots.map((slot, i) => (
              <button
                key={`today-${i}`}
                onClick={() => onSelectSlot(slot.date, slot.time, slot.professionalId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border bg-background hover:shadow-sm transition-all"
                style={{
                  borderColor: `${primaryColor}40`,
                }}
              >
                <Clock className="w-3 h-3" style={{ color: primaryColor }} />
                <span>{slot.time}</span>
                {!professionalId && (
                  <span className="text-[10px] text-muted-foreground">
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
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Amanhã</p>
          <div className="flex gap-2 flex-wrap">
            {tomorrowSlots.map((slot, i) => (
              <button
                key={`tomorrow-${i}`}
                onClick={() => onSelectSlot(slot.date, slot.time, slot.professionalId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border bg-background hover:shadow-sm transition-all"
                style={{
                  borderColor: `${primaryColor}40`,
                }}
              >
                <Clock className="w-3 h-3" style={{ color: primaryColor }} />
                <span>{slot.time}</span>
                {!professionalId && (
                  <span className="text-[10px] text-muted-foreground">
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
