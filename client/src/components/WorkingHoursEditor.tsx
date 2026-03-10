import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Clock, Save, RotateCcw, Coffee } from "lucide-react";

const DAY_NAMES = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const DAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type DaySchedule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  isActive: boolean;
  showBreak: boolean;
};

const DEFAULT_SCHEDULE: DaySchedule[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  startTime: "09:00",
  endTime: "18:00",
  breakStart: null,
  breakEnd: null,
  isActive: i >= 1 && i <= 5, // Mon-Fri active by default
  showBreak: false,
}));

export default function WorkingHoursEditor({
  professionalId,
  professionalName,
}: {
  professionalId: number;
  professionalName: string;
}) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: savedHours, isLoading } =
    trpc.workingHours.getByProfessional.useQuery({ professionalId });

  const saveMutation = trpc.workingHours.saveWeek.useMutation({
    onSuccess: () => {
      toast.success("Horários salvos com sucesso!");
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao salvar horários.");
    },
  });

  // Load saved schedule into state
  useEffect(() => {
    if (savedHours && savedHours.length > 0) {
      const loaded: DaySchedule[] = DEFAULT_SCHEDULE.map((def) => {
        const saved = savedHours.find(
          (h: any) => h.dayOfWeek === def.dayOfWeek
        );
        if (saved) {
          return {
            dayOfWeek: saved.dayOfWeek,
            startTime: saved.startTime,
            endTime: saved.endTime,
            breakStart: saved.breakStart,
            breakEnd: saved.breakEnd,
            isActive: saved.isActive ?? true,
            showBreak: !!(saved.breakStart && saved.breakEnd),
          };
        }
        return def;
      });
      setSchedule(loaded);
      setHasChanges(false);
    }
  }, [savedHours]);

  const updateDay = (dayOfWeek: number, updates: Partial<DaySchedule>) => {
    setSchedule((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dayOfWeek ? { ...d, ...updates } : d
      )
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    const payload = schedule.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      startTime: day.startTime,
      endTime: day.endTime,
      breakStart: day.showBreak && day.breakStart ? day.breakStart : null,
      breakEnd: day.showBreak && day.breakEnd ? day.breakEnd : null,
      isActive: day.isActive,
    }));

    saveMutation.mutate({
      professionalId,
      schedule: payload,
    });
  };

  const handleReset = () => {
    if (savedHours && savedHours.length > 0) {
      const loaded: DaySchedule[] = DEFAULT_SCHEDULE.map((def) => {
        const saved = savedHours.find(
          (h: any) => h.dayOfWeek === def.dayOfWeek
        );
        if (saved) {
          return {
            dayOfWeek: saved.dayOfWeek,
            startTime: saved.startTime,
            endTime: saved.endTime,
            breakStart: saved.breakStart,
            breakEnd: saved.breakEnd,
            isActive: saved.isActive ?? true,
            showBreak: !!(saved.breakStart && saved.breakEnd),
          };
        }
        return def;
      });
      setSchedule(loaded);
    } else {
      setSchedule(DEFAULT_SCHEDULE);
    }
    setHasChanges(false);
    toast.info("Alterações descartadas.");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando horários...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Horários de Atendimento
            </CardTitle>
            <CardDescription>
              Grade semanal de {professionalName}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={saveMutation.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Descartar
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {schedule.map((day) => (
          <div
            key={day.dayOfWeek}
            className={`rounded-lg border p-3 transition-colors ${
              day.isActive
                ? "bg-card border-border"
                : "bg-muted/30 border-border/50"
            }`}
          >
            {/* Day header row */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-[140px]">
                <Switch
                  checked={day.isActive}
                  onCheckedChange={(checked) =>
                    updateDay(day.dayOfWeek, { isActive: checked })
                  }
                />
                <Label
                  className={`text-sm font-medium ${
                    !day.isActive ? "text-muted-foreground" : ""
                  }`}
                >
                  <span className="hidden sm:inline">
                    {DAY_NAMES[day.dayOfWeek]}
                  </span>
                  <span className="sm:hidden">
                    {DAY_SHORT[day.dayOfWeek]}
                  </span>
                </Label>
              </div>

              {day.isActive && (
                <>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={day.startTime}
                      onChange={(e) =>
                        updateDay(day.dayOfWeek, {
                          startTime: e.target.value,
                        })
                      }
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-muted-foreground text-sm">até</span>
                    <input
                      type="time"
                      value={day.endTime}
                      onChange={(e) =>
                        updateDay(day.dayOfWeek, {
                          endTime: e.target.value,
                        })
                      }
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-2 text-xs ${
                      day.showBreak
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                    onClick={() =>
                      updateDay(day.dayOfWeek, {
                        showBreak: !day.showBreak,
                        breakStart: !day.showBreak ? "12:00" : null,
                        breakEnd: !day.showBreak ? "13:00" : null,
                      })
                    }
                  >
                    <Coffee className="h-3.5 w-3.5 mr-1" />
                    Intervalo
                  </Button>
                </>
              )}
            </div>

            {/* Break row */}
            {day.isActive && day.showBreak && (
              <div className="flex items-center gap-1.5 mt-2 ml-[140px] flex-wrap">
                <Coffee className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mr-1">
                  Intervalo:
                </span>
                <input
                  type="time"
                  value={day.breakStart || "12:00"}
                  onChange={(e) =>
                    updateDay(day.dayOfWeek, {
                      breakStart: e.target.value,
                    })
                  }
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-muted-foreground text-xs">até</span>
                <input
                  type="time"
                  value={day.breakEnd || "13:00"}
                  onChange={(e) =>
                    updateDay(day.dayOfWeek, {
                      breakEnd: e.target.value,
                    })
                  }
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
          </div>
        ))}

        {/* Summary */}
        <div className="pt-2 border-t text-sm text-muted-foreground">
          {schedule.filter((d) => d.isActive).length} dia(s) ativo(s) na
          semana
          {hasChanges && (
            <span className="text-amber-600 ml-2 font-medium">
              • Alterações não salvas
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
