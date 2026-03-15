/**
 * BookingCalendar — Calendário visual com indicadores de disponibilidade
 *
 * Cores:
 * - Verde: muitos horários disponíveis (good)
 * - Amarelo: poucos horários (limited)
 * - Cinza: sem horários (full) ou dia passado
 * - Azul: dia selecionado
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

interface DayAvailability {
  date: string; // "YYYY-MM-DD"
  status: "good" | "limited" | "full" | "unknown";
  count: number;
}

interface BookingCalendarProps {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  slug: string;
  professionalId: number;
  serviceId: number;
  primaryColor: string;
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function getDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getTodayString(): string {
  return getDateString(new Date());
}

function isPast(dateStr: string): boolean {
  const today = getTodayString();
  return dateStr < today;
}

export function BookingCalendar({
  selectedDate,
  onSelectDate,
  slug,
  professionalId,
  serviceId,
  primaryColor,
}: BookingCalendarProps) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, DayAvailability>>({});
  const [loadingDays, setLoadingDays] = useState<Set<string>>(new Set());

  // Generate calendar days for the current month view
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: (string | null)[] = [];

    // Padding for days before the 1st
    for (let i = 0; i < startPad; i++) {
      days.push(null);
    }

    // Actual days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push(dateStr);
    }

    return days;
  }, [viewMonth, viewYear]);

  // Fetch availability for visible non-past days
  useEffect(() => {
    const todayStr = getTodayString();
    const futureDays = calendarDays.filter(
      (d): d is string => d !== null && d >= todayStr && !availabilityMap[d]
    );

    if (futureDays.length === 0) return;

    // Fetch availability for each day (limit concurrent requests)
    let cancelled = false;

    async function fetchBatch() {
      // Only fetch first 14 days to avoid too many requests
      const batch = futureDays.slice(0, 14);
      setLoadingDays((prev) => {
        const next = new Set(prev);
        batch.forEach((d) => next.add(d));
        return next;
      });

      for (const dateStr of batch) {
        if (cancelled) break;
        try {
          const params = new URLSearchParams({
            slug,
            professionalId: String(professionalId),
            serviceId: String(serviceId),
            date: dateStr,
          });
          const res = await fetch(`/api/public/availability?${params}`);
          if (!res.ok) continue;
          const data = await res.json();

          if (!cancelled) {
            setAvailabilityMap((prev) => ({
              ...prev,
              [dateStr]: {
                date: dateStr,
                status: data.summary?.status ?? (data.slots?.length > 0 ? "good" : "full"),
                count: data.summary?.availableCount ?? data.slots?.length ?? 0,
              },
            }));
          }
        } catch {
          // ignore
        } finally {
          if (!cancelled) {
            setLoadingDays((prev) => {
              const next = new Set(prev);
              next.delete(dateStr);
              return next;
            });
          }
        }
      }
    }

    fetchBatch();
    return () => { cancelled = true; };
  }, [calendarDays, slug, professionalId, serviceId]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  const canGoPrev =
    viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  function getDayStyle(dateStr: string) {
    const isSelected = dateStr === selectedDate;
    const isToday = dateStr === getTodayString();
    const past = isPast(dateStr);
    const avail = availabilityMap[dateStr];
    const isLoading = loadingDays.has(dateStr);

    if (isSelected) {
      return {
        bg: primaryColor,
        text: "#fff",
        ring: `2px solid ${primaryColor}`,
        cursor: "pointer" as const,
        dot: null,
      };
    }

    if (past) {
      return {
        bg: "transparent",
        text: "var(--muted-foreground)",
        ring: "none",
        cursor: "default" as const,
        dot: null,
        opacity: 0.4,
      };
    }

    if (isLoading) {
      return {
        bg: "transparent",
        text: "var(--foreground)",
        ring: isToday ? `2px solid ${primaryColor}40` : "none",
        cursor: "pointer" as const,
        dot: "var(--muted-foreground)",
      };
    }

    if (!avail) {
      return {
        bg: "transparent",
        text: "var(--foreground)",
        ring: isToday ? `2px solid ${primaryColor}40` : "none",
        cursor: "pointer" as const,
        dot: null,
      };
    }

    const dotColor =
      avail.status === "good"
        ? "#22c55e"
        : avail.status === "limited"
        ? "#eab308"
        : "#94a3b8";

    return {
      bg: "transparent",
      text: avail.status === "full" ? "var(--muted-foreground)" : "var(--foreground)",
      ring: isToday ? `2px solid ${primaryColor}40` : "none",
      cursor: avail.status === "full" ? ("default" as const) : ("pointer" as const),
      dot: dotColor,
      opacity: avail.status === "full" ? 0.5 : 1,
    };
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base font-semibold text-foreground">Escolha a data</span>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            disabled={!canGoPrev}
            className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-foreground">
            {MONTH_LABELS[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="text-center text-[10px] font-medium text-muted-foreground py-1"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dateStr, i) => {
            if (!dateStr) {
              return <div key={`pad-${i}`} className="aspect-square" />;
            }

            const dayNum = parseInt(dateStr.split("-")[2], 10);
            const style = getDayStyle(dateStr);
            const past = isPast(dateStr);
            const avail = availabilityMap[dateStr];
            const isFull = avail?.status === "full";

            return (
              <button
                key={dateStr}
                onClick={() => {
                  if (!past && !isFull) onSelectDate(dateStr);
                }}
                disabled={past || isFull}
                className="aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative transition-all"
                style={{
                  backgroundColor: style.bg,
                  color: style.text,
                  border: style.ring,
                  cursor: style.cursor,
                  opacity: (style as any).opacity ?? 1,
                }}
              >
                {dayNum}
                {style.dot && (
                  <span
                    className="absolute bottom-1 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: style.dot }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Disponível
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> Poucos
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" /> Lotado
          </span>
        </div>
      </div>
    </div>
  );
}
