import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import {
  CalendarPlus,
  Plus,
  Loader2,
  Clock,
  User,
  Scissors,
  Phone,
  Filter,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Check,
  X,
  AlertCircle,
  MoreHorizontal,
  CalendarOff,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ============================================================
// TYPES
// ============================================================

type Appointment = {
  id: number;
  professionalId: number;
  serviceId: number;
  customerId: number;
  startDatetime: string | Date;
  endDatetime: string | Date;
  durationMinutes: number;
  status: string;
  price: string;
  notes: string | null;
  source: string;
  createdAt: string | Date;
};

type Professional = {
  id: number;
  name: string;
  isActive: boolean;
};

type Service = {
  id: number;
  name: string;
  durationMinutes: number;
  price: string;
  isActive: boolean;
};

type Customer = {
  id: number;
  name: string;
  phone: string;
  isActive: boolean;
};

type AvailableSlot = {
  start: string;
  end: string;
};

// ============================================================
// HELPERS
// ============================================================

const STATUS_MAP: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: "Pendente", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200" },
  confirmed: { label: "Confirmado", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200" },
  cancelled: { label: "Cancelado", color: "text-red-700", bgColor: "bg-red-50 border-red-200" },
  completed: { label: "Concluído", color: "text-green-700", bgColor: "bg-green-50 border-green-200" },
  no_show: { label: "Não compareceu", color: "text-gray-700", bgColor: "bg-gray-50 border-gray-200" },
};

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(d: string | Date): string {
  return new Date(d).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ============================================================
// CREATION WIZARD STEPS
// ============================================================

type WizardStep = "professional" | "service" | "customer" | "datetime" | "confirm";

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Appointments() {
  // List filters
  const [filterDate, setFilterDate] = useState(getTodayString());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProfessional, setFilterProfessional] = useState<string>("all");

  // Creation wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("professional");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [appointmentNotes, setAppointmentNotes] = useState("");

  // Cancel dialog
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Customer search
  const [customerSearch, setCustomerSearch] = useState("");

  // Data queries
  const dateFrom = filterDate ? new Date(filterDate + "T00:00:00").toISOString() : undefined;
  const dateTo = filterDate ? new Date(filterDate + "T23:59:59").toISOString() : undefined;

  const listInput = useMemo(() => ({
    dateFrom,
    dateTo,
    status: filterStatus !== "all" ? filterStatus : undefined,
    professionalId: filterProfessional !== "all" ? Number(filterProfessional) : undefined,
  }), [dateFrom, dateTo, filterStatus, filterProfessional]);

  const { data: appointmentsList, isLoading: loadingAppointments } = trpc.appointment.list.useQuery(listInput);
  const { data: professionals } = trpc.professional.list.useQuery();
  const { data: services } = trpc.service.list.useQuery();
  const { data: customersList } = trpc.customer.list.useQuery(
    customerSearch ? { search: customerSearch } : undefined
  );

  // Availability query (only when professional, service, and date are selected)
  const slotsInput = useMemo(() => {
    if (!selectedProfessionalId || !selectedServiceId || !selectedDate) return null;
    return {
      professionalId: selectedProfessionalId,
      serviceId: selectedServiceId,
      date: selectedDate,
    };
  }, [selectedProfessionalId, selectedServiceId, selectedDate]);

  const { data: availabilityData, isLoading: loadingSlots } = trpc.availability.getSlots.useQuery(
    slotsInput!,
    { enabled: !!slotsInput }
  );

  const utils = trpc.useUtils();

  // Mutations
  const createMutation = trpc.appointment.create.useMutation({
    onSuccess: () => {
      toast.success("Agendamento criado com sucesso!");
      closeWizard();
      utils.appointment.list.invalidate();
      utils.appointment.count.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateStatusMutation = trpc.appointment.updateStatus.useMutation({
    onSuccess: (_, variables) => {
      const statusLabel = STATUS_MAP[variables.status]?.label ?? variables.status;
      toast.success(`Status alterado para ${statusLabel}.`);
      utils.appointment.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const cancelMutation = trpc.appointment.cancel.useMutation({
    onSuccess: () => {
      toast.success("Agendamento cancelado.");
      setCancelTarget(null);
      setCancelReason("");
      utils.appointment.list.invalidate();
      utils.appointment.count.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Helpers to resolve names
  function getProfessionalName(id: number): string {
    return professionals?.find((p: Professional) => p.id === id)?.name ?? `#${id}`;
  }
  function getServiceName(id: number): string {
    return services?.find((s: Service) => s.id === id)?.name ?? `#${id}`;
  }
  function getCustomerName(id: number): string {
    return customersList?.find((c: Customer) => c.id === id)?.name ?? `#${id}`;
  }

  // Wizard navigation
  function openWizard() {
    setWizardStep("professional");
    setSelectedProfessionalId(null);
    setSelectedServiceId(null);
    setSelectedCustomerId(null);
    setSelectedDate(getTodayString());
    setSelectedSlot(null);
    setAppointmentNotes("");
    setCustomerSearch("");
    setWizardOpen(true);
  }

  function closeWizard() {
    setWizardOpen(false);
  }

  function goToStep(step: WizardStep) {
    setWizardStep(step);
  }

  function handleCreateAppointment() {
    if (!selectedProfessionalId || !selectedServiceId || !selectedCustomerId || !selectedSlot) return;

    const startDatetime = new Date(`${selectedDate}T${selectedSlot.start}:00`);

    createMutation.mutate({
      professionalId: selectedProfessionalId,
      serviceId: selectedServiceId,
      customerId: selectedCustomerId,
      startDatetime: startDatetime.toISOString(),
      notes: appointmentNotes || "",
    });
  }

  // Date navigation
  function navigateDate(direction: number) {
    const d = new Date(filterDate);
    d.setDate(d.getDate() + direction);
    setFilterDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  // Get professional services for selected professional
  const { data: profServiceLinks } = trpc.professional.services.useQuery(
    { professionalId: selectedProfessionalId! },
    { enabled: !!selectedProfessionalId }
  );

  const availableServicesForProfessional = useMemo(() => {
    if (!profServiceLinks || !services) return [];
    const activeServiceIds = profServiceLinks
      .filter((l: any) => l.isActive)
      .map((l: any) => l.serviceId);
    return services.filter((s: Service) => activeServiceIds.includes(s.id) && s.isActive);
  }, [profServiceLinks, services]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Agendamentos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os agendamentos do seu estabelecimento
            </p>
          </div>
          <Button onClick={openWizard} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo agendamento
          </Button>
        </div>

        {/* Date navigation + filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-[160px]"
            />
            <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterDate(getTodayString())}
              className="text-xs"
            >
              Hoje
            </Button>
          </div>

          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="no_show">Não compareceu</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterProfessional} onValueChange={setFilterProfessional}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Profissional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {professionals?.filter((p: Professional) => p.isActive).map((p: Professional) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Appointments list */}
        {loadingAppointments ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Carregando agendamentos...</span>
          </div>
        ) : !appointmentsList || appointmentsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <CalendarOff className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
              Nenhum agendamento encontrado
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Não há agendamentos para esta data e filtros selecionados.
            </p>
            <Button onClick={openWizard} className="mt-4 gap-2">
              <Plus className="w-4 h-4" />
              Criar agendamento
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              {appointmentsList.length} agendamento{appointmentsList.length !== 1 ? "s" : ""}
            </p>
            {appointmentsList.map((appt: Appointment) => {
              const status = STATUS_MAP[appt.status] ?? STATUS_MAP.pending;
              return (
                <div
                  key={appt.id}
                  className="group flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-accent/5 transition-colors"
                >
                  {/* Time column */}
                  <div className="flex flex-col items-center shrink-0 w-16">
                    <span className="text-lg font-bold text-foreground">
                      {formatTime(appt.startDatetime)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(appt.endDatetime)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-foreground">
                        {getCustomerName(appt.customerId)}
                      </h3>
                      <Badge variant="outline" className={`text-xs ${status.color} ${status.bgColor}`}>
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <User className="w-3.5 h-3.5" />
                        {getProfessionalName(appt.professionalId)}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Scissors className="w-3.5 h-3.5" />
                        {getServiceName(appt.serviceId)}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {appt.durationMinutes}min
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {formatCurrency(appt.price)}
                      </span>
                    </div>
                    {appt.notes && (
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">
                        {appt.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {appt.status === "pending" && (
                        <DropdownMenuItem
                          onClick={() =>
                            updateStatusMutation.mutate({ id: appt.id, status: "confirmed" })
                          }
                        >
                          <Check className="w-4 h-4 mr-2 text-blue-600" />
                          Confirmar
                        </DropdownMenuItem>
                      )}
                      {(appt.status === "pending" || appt.status === "confirmed") && (
                        <DropdownMenuItem
                          onClick={() =>
                            updateStatusMutation.mutate({ id: appt.id, status: "completed" })
                          }
                        >
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                          Concluir
                        </DropdownMenuItem>
                      )}
                      {(appt.status === "pending" || appt.status === "confirmed") && (
                        <DropdownMenuItem
                          onClick={() =>
                            updateStatusMutation.mutate({ id: appt.id, status: "no_show" })
                          }
                        >
                          <AlertCircle className="w-4 h-4 mr-2 text-gray-500" />
                          Não compareceu
                        </DropdownMenuItem>
                      )}
                      {(appt.status === "pending" || appt.status === "confirmed") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setCancelTarget(appt)}
                            className="text-destructive focus:text-destructive"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancelar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* CREATION WIZARD DIALOG */}
      {/* ============================================================ */}
      <Dialog open={wizardOpen} onOpenChange={(open) => !open && closeWizard()}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Novo agendamento</DialogTitle>
            <DialogDescription>
              {wizardStep === "professional" && "Selecione o profissional"}
              {wizardStep === "service" && "Selecione o serviço"}
              {wizardStep === "customer" && "Selecione o cliente"}
              {wizardStep === "datetime" && "Escolha a data e horário"}
              {wizardStep === "confirm" && "Confirme os dados do agendamento"}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center gap-1 mb-2">
            {(["professional", "service", "customer", "datetime", "confirm"] as WizardStep[]).map(
              (step, idx) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    idx <=
                    ["professional", "service", "customer", "datetime", "confirm"].indexOf(
                      wizardStep
                    )
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                />
              )
            )}
          </div>

          {/* STEP 1: Professional */}
          {wizardStep === "professional" && (
            <div className="space-y-2 py-2">
              {professionals?.filter((p: Professional) => p.isActive).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum profissional ativo cadastrado.
                </p>
              ) : (
                professionals
                  ?.filter((p: Professional) => p.isActive)
                  .map((p: Professional) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProfessionalId(p.id);
                        setSelectedServiceId(null);
                        setSelectedSlot(null);
                        goToStep("service");
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-accent/10 text-left ${
                        selectedProfessionalId === p.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{p.name}</span>
                      <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                    </button>
                  ))
              )}
            </div>
          )}

          {/* STEP 2: Service */}
          {wizardStep === "service" && (
            <div className="space-y-2 py-2">
              <Button variant="ghost" size="sm" onClick={() => goToStep("professional")} className="mb-2">
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              {availableServicesForProfessional.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Este profissional não tem serviços vinculados.
                </p>
              ) : (
                availableServicesForProfessional.map((s: Service) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedServiceId(s.id);
                      setSelectedSlot(null);
                      goToStep("customer");
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-accent/10 text-left ${
                      selectedServiceId === s.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Scissors className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground block">{s.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.durationMinutes}min · {formatCurrency(s.price)}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>
          )}

          {/* STEP 3: Customer */}
          {wizardStep === "customer" && (
            <div className="space-y-3 py-2">
              <Button variant="ghost" size="sm" onClick={() => goToStep("service")} className="mb-1">
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <Input
                placeholder="Buscar cliente por nome ou telefone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {customersList?.filter((c: Customer) => c.isActive).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {customerSearch ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}
                  </p>
                ) : (
                  customersList
                    ?.filter((c: Customer) => c.isActive)
                    .map((c: Customer) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          goToStep("datetime");
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-accent/10 text-left ${
                          selectedCustomerId === c.id
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-foreground block">{c.name}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {c.phone}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ))
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Date & Time */}
          {wizardStep === "datetime" && (
            <div className="space-y-4 py-2">
              <Button variant="ghost" size="sm" onClick={() => goToStep("customer")} className="mb-1">
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>

              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  min={getTodayString()}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Horários disponíveis</Label>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Calculando disponibilidade...</span>
                  </div>
                ) : !availabilityData || availabilityData.slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum horário disponível nesta data.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[250px] overflow-y-auto">
                    {availabilityData.slots.map((slot: AvailableSlot) => (
                      <button
                        key={slot.start}
                        onClick={() => setSelectedSlot(slot)}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                          selectedSlot?.start === slot.start
                            ? "border-primary bg-primary text-primary-foreground font-medium"
                            : "border-border hover:bg-accent/10 text-foreground"
                        }`}
                      >
                        {slot.start}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedSlot && (
                <div className="flex justify-end">
                  <Button onClick={() => goToStep("confirm")} className="gap-2">
                    Continuar <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Confirm */}
          {wizardStep === "confirm" && (
            <div className="space-y-4 py-2">
              <Button variant="ghost" size="sm" onClick={() => goToStep("datetime")} className="mb-1">
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>

              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground">Profissional</span>
                    <p className="font-medium text-foreground">
                      {selectedProfessionalId ? getProfessionalName(selectedProfessionalId) : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Scissors className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground">Serviço</span>
                    <p className="font-medium text-foreground">
                      {selectedServiceId ? getServiceName(selectedServiceId) : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground">Cliente</span>
                    <p className="font-medium text-foreground">
                      {selectedCustomerId ? getCustomerName(selectedCustomerId) : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground">Data e horário</span>
                    <p className="font-medium text-foreground">
                      {selectedDate
                        ? new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", {
                            weekday: "long",
                            day: "2-digit",
                            month: "long",
                          })
                        : "—"}{" "}
                      às {selectedSlot?.start ?? "—"} — {selectedSlot?.end ?? "—"}
                    </p>
                  </div>
                </div>
                {availabilityData && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="text-xs text-muted-foreground">Duração e valor</span>
                      <p className="font-medium text-foreground">
                        {availabilityData.durationMinutes}min · {formatCurrency(availabilityData.effectivePrice)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="appt-notes">Observações (opcional)</Label>
                <Textarea
                  id="appt-notes"
                  placeholder="Alguma observação sobre este agendamento..."
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeWizard} disabled={createMutation.isPending}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateAppointment} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirmar agendamento
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* CANCEL DIALOG */}
      {/* ============================================================ */}
      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
            setCancelReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O agendamento de{" "}
              <strong>{cancelTarget ? getCustomerName(cancelTarget.customerId) : ""}</strong>{" "}
              em <strong>{cancelTarget ? formatDate(cancelTarget.startDatetime) : ""}</strong>{" "}
              às <strong>{cancelTarget ? formatTime(cancelTarget.startDatetime) : ""}</strong>{" "}
              será cancelado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
            <Input
              id="cancel-reason"
              placeholder="Motivo do cancelamento..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-1"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelTarget) {
                  cancelMutation.mutate({
                    id: cancelTarget.id,
                    reason: cancelReason || undefined,
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cancelar agendamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
