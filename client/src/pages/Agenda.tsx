import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Scissors,
  Filter,
  MoreHorizontal,
  Check,
  X,
  AlertCircle,
  Eye,
  CalendarOff,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

// ============================================================
// STATUS CONFIG
// ============================================================

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string; dotColor: string }
> = {
  pending: {
    label: "Pendente",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    dotColor: "bg-amber-500",
  },
  confirmed: {
    label: "Confirmado",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    dotColor: "bg-emerald-500",
  },
  cancelled: {
    label: "Cancelado",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    dotColor: "bg-red-400",
  },
  completed: {
    label: "Concluído",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    dotColor: "bg-blue-500",
  },
  no_show: {
    label: "Não compareceu",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    dotColor: "bg-gray-400",
  },
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled", "no_show"],
  confirmed: ["completed", "cancelled", "no_show"],
};

// ============================================================
// HELPERS
// ============================================================

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatTime(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday start
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function getWeekDays(startOfWeek: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// ============================================================
// COMPONENT
// ============================================================

type ViewMode = "day" | "week";

export default function Agenda() {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("all");

  // Detail dialog
  const [detailAppt, setDetailAppt] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Status change dialog
  const [statusChangeAppt, setStatusChangeAppt] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  // Cancel dialog
  const [cancelAppt, setCancelAppt] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Compute date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === "day") {
      return {
        from: getStartOfDay(currentDate),
        to: getEndOfDay(currentDate),
      };
    } else {
      return {
        from: getStartOfWeek(currentDate),
        to: getEndOfWeek(currentDate),
      };
    }
  }, [viewMode, currentDate]);

  // Stable query input
  const queryInput = useMemo(() => {
    const input: Record<string, any> = {
      dateFrom: dateRange.from.toISOString(),
      dateTo: dateRange.to.toISOString(),
    };
    if (selectedProfessionalId !== "all") {
      input.professionalId = Number(selectedProfessionalId);
    }
    return input;
  }, [dateRange.from, dateRange.to, selectedProfessionalId]);

  // Data queries
  const { data: appointments, isLoading } = trpc.appointment.list.useQuery(queryInput);
  const { data: professionals } = trpc.professional.list.useQuery();
  const { data: services } = trpc.service.list.useQuery();
  const { data: customers } = trpc.customer.list.useQuery();
  const utils = trpc.useUtils();

  // Mutations
  const updateStatusMutation = trpc.appointment.updateStatus.useMutation({
    onSuccess: () => {
      utils.appointment.list.invalidate();
      toast.success("Status atualizado com sucesso!");
      setShowStatusDialog(false);
      setShowDetail(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelMutation = trpc.appointment.cancel.useMutation({
    onSuccess: () => {
      utils.appointment.list.invalidate();
      toast.success("Agendamento cancelado.");
      setShowCancelDialog(false);
      setShowDetail(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // Lookup helpers
  const getProfessionalName = (id: number) =>
    professionals?.find((p) => p.id === id)?.name ?? "—";
  const getServiceName = (id: number) =>
    services?.find((s) => s.id === id)?.name ?? "—";
  const getCustomerName = (id: number) =>
    customers?.find((c) => c.id === id)?.name ?? "—";
  const getCustomerPhone = (id: number) =>
    customers?.find((c) => c.id === id)?.phone ?? "";

  // Navigation
  function navigateDate(direction: number) {
    const d = new Date(currentDate);
    if (viewMode === "day") {
      d.setDate(d.getDate() + direction);
    } else {
      d.setDate(d.getDate() + direction * 7);
    }
    setCurrentDate(d);
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  // Group appointments by day for week view
  const appointmentsByDay = useMemo(() => {
    if (!appointments) return {};
    const grouped: Record<string, any[]> = {};
    for (const appt of appointments) {
      const key = toDateKey(new Date(appt.startDatetime));
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(appt);
    }
    // Sort each day's appointments chronologically
    for (const key of Object.keys(grouped)) {
      grouped[key].sort(
        (a, b) =>
          new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
      );
    }
    return grouped;
  }, [appointments]);

  // Sorted appointments for day view
  const sortedAppointments = useMemo(() => {
    if (!appointments) return [];
    return [...appointments].sort(
      (a, b) =>
        new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
    );
  }, [appointments]);

  // Week days
  const weekDays = useMemo(() => {
    return getWeekDays(getStartOfWeek(currentDate));
  }, [currentDate]);

  // Handlers
  function openDetail(appt: any) {
    setDetailAppt(appt);
    setShowDetail(true);
  }

  function openStatusChange(appt: any, status: string) {
    setStatusChangeAppt(appt);
    setNewStatus(status);
    setStatusReason("");
    setShowStatusDialog(true);
  }

  function openCancel(appt: any) {
    setCancelAppt(appt);
    setCancelReason("");
    setShowCancelDialog(true);
  }

  function confirmStatusChange() {
    if (!statusChangeAppt) return;
    updateStatusMutation.mutate({
      id: statusChangeAppt.id,
      status: newStatus as any,
      reason: statusReason || undefined,
    });
  }

  function confirmCancel() {
    if (!cancelAppt) return;
    cancelMutation.mutate({
      id: cancelAppt.id,
      reason: cancelReason || undefined,
    });
  }

  // ============================================================
  // APPOINTMENT CARD (shared between views)
  // ============================================================

  function AppointmentCard({ appt, compact = false }: { appt: any; compact?: boolean }) {
    const status = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.pending;
    const availableTransitions = STATUS_TRANSITIONS[appt.status] ?? [];

    return (
      <div
        className={`group relative rounded-lg border ${status.borderColor} ${status.bgColor} p-3 cursor-pointer transition-all hover:shadow-md`}
        onClick={() => openDetail(appt)}
      >
        {/* Status dot + time */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`w-2 h-2 rounded-full ${status.dotColor} shrink-0`} />
          <span className="text-sm font-semibold text-foreground">
            {formatTime(appt.startDatetime)} – {formatTime(appt.endDatetime)}
          </span>
          <Badge
            variant="outline"
            className={`ml-auto text-xs ${status.color} ${status.borderColor} border`}
          >
            {status.label}
          </Badge>
        </div>

        {/* Info */}
        <div className={`space-y-0.5 ${compact ? "text-xs" : "text-sm"}`}>
          <div className="flex items-center gap-1.5 text-foreground">
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">{getCustomerName(appt.customerId)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Scissors className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{getServiceName(appt.serviceId)}</span>
          </div>
          {!compact && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{appt.durationMinutes} min</span>
              {appt.price && (
                <>
                  <span className="mx-1">·</span>
                  <span>R$ {Number(appt.price).toFixed(2)}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions dropdown */}
        {availableTransitions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => openDetail(appt)}>
                <Eye className="w-4 h-4 mr-2" />
                Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {availableTransitions.map((s) => {
                const cfg = STATUS_CONFIG[s];
                if (s === "cancelled") {
                  return (
                    <DropdownMenuItem
                      key={s}
                      className="text-red-600"
                      onClick={() => openCancel(appt)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </DropdownMenuItem>
                  );
                }
                return (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => openStatusChange(appt, s)}
                  >
                    {s === "confirmed" && <Check className="w-4 h-4 mr-2" />}
                    {s === "completed" && <Check className="w-4 h-4 mr-2" />}
                    {s === "no_show" && <AlertCircle className="w-4 h-4 mr-2" />}
                    {cfg?.label ?? s}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  // ============================================================
  // DAY VIEW
  // ============================================================

  function DayView() {
    if (sortedAppointments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CalendarOff className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">Nenhum agendamento</p>
          <p className="text-sm mt-1">
            {isToday(currentDate)
              ? "Não há agendamentos para hoje."
              : `Não há agendamentos para ${currentDate.toLocaleDateString("pt-BR")}.`}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {sortedAppointments.map((appt) => (
          <AppointmentCard key={appt.id} appt={appt} />
        ))}
      </div>
    );
  }

  // ============================================================
  // WEEK VIEW
  // ============================================================

  function WeekView() {
    const hasAny = appointments && appointments.length > 0;

    return (
      <div className="space-y-4">
        {weekDays.map((day) => {
          const key = toDateKey(day);
          const dayAppts = appointmentsByDay[key] ?? [];
          const today = isToday(day);

          return (
            <div key={key}>
              {/* Day header */}
              <div
                className={`flex items-center gap-2 mb-2 pb-1.5 border-b ${
                  today ? "border-primary" : "border-border"
                }`}
              >
                <span
                  className={`text-sm font-semibold capitalize ${
                    today ? "text-primary" : "text-foreground"
                  }`}
                >
                  {day.toLocaleDateString("pt-BR", { weekday: "long" })}
                </span>
                <span
                  className={`text-sm ${
                    today ? "text-primary font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </span>
                {today && (
                  <Badge variant="default" className="text-xs ml-1">
                    Hoje
                  </Badge>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {dayAppts.length} agendamento{dayAppts.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Day appointments */}
              {dayAppts.length === 0 ? (
                <p className="text-sm text-muted-foreground pl-2 py-2 italic">
                  Sem agendamentos
                </p>
              ) : (
                <div className="space-y-2">
                  {dayAppts.map((appt) => (
                    <AppointmentCard key={appt.id} appt={appt} compact />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {!hasAny && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <CalendarOff className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-base font-medium">Semana sem agendamentos</p>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">Agenda</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Visualize e gerencie seus agendamentos
            </p>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "day" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5"
              onClick={() => setViewMode("day")}
            >
              <CalendarDays className="w-4 h-4" />
              Dia
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5"
              onClick={() => setViewMode("week")}
            >
              <CalendarRange className="w-4 h-4" />
              Semana
            </Button>
          </div>
        </div>

        {/* Controls bar */}
        <Card className="p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Date navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToToday}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Current date label */}
            <div className="text-sm font-medium text-foreground capitalize">
              {viewMode === "day"
                ? formatDate(currentDate)
                : `${formatDateShort(weekDays[0])} — ${formatDateShort(weekDays[6])}`}
            </div>

            {/* Professional filter */}
            <div className="flex items-center gap-2 sm:ml-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedProfessionalId} onValueChange={setSelectedProfessionalId}>
                <SelectTrigger className="w-[200px] h-8 text-sm">
                  <SelectValue placeholder="Todos os profissionais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os profissionais</SelectItem>
                  {professionals?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Status legend */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dotColor}`} />
              {cfg.label}
            </div>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Carregando agenda...</span>
          </div>
        ) : viewMode === "day" ? (
          <DayView />
        ) : (
          <WeekView />
        )}

        {/* Summary */}
        {appointments && appointments.length > 0 && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
            {appointments.length} agendamento{appointments.length !== 1 ? "s" : ""}{" "}
            {viewMode === "day" ? "neste dia" : "nesta semana"}
            {selectedProfessionalId !== "all" && (
              <span>
                {" "}
                · Filtrado por:{" "}
                <strong>{getProfessionalName(Number(selectedProfessionalId))}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* DETAIL DIALOG */}
      {/* ============================================================ */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
            <DialogDescription>
              Informações completas do agendamento
            </DialogDescription>
          </DialogHeader>

          {detailAppt && (
            <div className="space-y-4">
              {/* Status badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {(() => {
                  const cfg = STATUS_CONFIG[detailAppt.status] ?? STATUS_CONFIG.pending;
                  return (
                    <Badge
                      variant="outline"
                      className={`${cfg.color} ${cfg.borderColor} border`}
                    >
                      <span className={`w-2 h-2 rounded-full ${cfg.dotColor} mr-1.5`} />
                      {cfg.label}
                    </Badge>
                  );
                })()}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Horário
                </span>
                <span className="font-medium">
                  {formatTime(detailAppt.startDatetime)} – {formatTime(detailAppt.endDatetime)}
                  <span className="text-muted-foreground ml-1">({detailAppt.durationMinutes} min)</span>
                </span>

                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" /> Data
                </span>
                <span className="font-medium">
                  {new Date(detailAppt.startDatetime).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                </span>

                <span className="text-muted-foreground flex items-center gap-1.5">
                  <User className="w-4 h-4" /> Cliente
                </span>
                <span className="font-medium">
                  {getCustomerName(detailAppt.customerId)}
                  {getCustomerPhone(detailAppt.customerId) && (
                    <span className="text-muted-foreground ml-1 text-xs">
                      ({getCustomerPhone(detailAppt.customerId)})
                    </span>
                  )}
                </span>

                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Scissors className="w-4 h-4" /> Serviço
                </span>
                <span className="font-medium">{getServiceName(detailAppt.serviceId)}</span>

                <span className="text-muted-foreground flex items-center gap-1.5">
                  <User className="w-4 h-4" /> Profissional
                </span>
                <span className="font-medium">{getProfessionalName(detailAppt.professionalId)}</span>

                {detailAppt.price && (
                  <>
                    <span className="text-muted-foreground">Valor</span>
                    <span className="font-medium">R$ {Number(detailAppt.price).toFixed(2)}</span>
                  </>
                )}

                {detailAppt.notes && (
                  <>
                    <span className="text-muted-foreground">Observações</span>
                    <span className="text-sm">{detailAppt.notes}</span>
                  </>
                )}

                {detailAppt.cancellationReason && (
                  <>
                    <span className="text-muted-foreground text-red-600">Motivo cancelamento</span>
                    <span className="text-sm text-red-600">{detailAppt.cancellationReason}</span>
                  </>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {detailAppt && (STATUS_TRANSITIONS[detailAppt.status] ?? []).length > 0 && (
              <>
                {(STATUS_TRANSITIONS[detailAppt.status] ?? [])
                  .filter((s) => s !== "cancelled")
                  .map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    return (
                      <Button
                        key={s}
                        variant="outline"
                        size="sm"
                        onClick={() => openStatusChange(detailAppt, s)}
                      >
                        {s === "confirmed" && <Check className="w-4 h-4 mr-1" />}
                        {s === "completed" && <Check className="w-4 h-4 mr-1" />}
                        {s === "no_show" && <AlertCircle className="w-4 h-4 mr-1" />}
                        {cfg?.label}
                      </Button>
                    );
                  })}
                {(STATUS_TRANSITIONS[detailAppt.status] ?? []).includes("cancelled") && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => openCancel(detailAppt)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* STATUS CHANGE DIALOG */}
      {/* ============================================================ */}
      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar Status</AlertDialogTitle>
            <AlertDialogDescription>
              Alterar o status do agendamento de{" "}
              <strong>{STATUS_CONFIG[statusChangeAppt?.status]?.label ?? statusChangeAppt?.status}</strong>{" "}
              para <strong>{STATUS_CONFIG[newStatus]?.label ?? newStatus}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="status-reason">Motivo (opcional)</Label>
            <Textarea
              id="status-reason"
              placeholder="Motivo da alteração..."
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              rows={2}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================================ */}
      {/* CANCEL DIALOG */}
      {/* ============================================================ */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="cancel-reason">Motivo do cancelamento (opcional)</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Ex: Cliente solicitou cancelamento..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <X className="w-4 h-4 mr-1" />
              )}
              Cancelar agendamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
