import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Ban,
  Calendar,
  Clock,
  User,
  Filter,
  Loader2,
} from "lucide-react";

type BlockedTime = {
  id: number;
  establishmentId: number;
  professionalId: number | null;
  title: string;
  reason: string | null;
  startDatetime: string | Date;
  endDatetime: string | Date;
  isAllDay: boolean;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

function formatDate(d: string | Date): string {
  const date = new Date(d);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(d: string | Date): string {
  const date = new Date(d);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateRange(start: string | Date, end: string | Date, isAllDay: boolean): string {
  const startDate = formatDate(start);
  const endDate = formatDate(end);

  if (isAllDay) {
    return startDate === endDate ? `${startDate} (dia inteiro)` : `${startDate} a ${endDate} (dias inteiros)`;
  }

  if (startDate === endDate) {
    return `${startDate} das ${formatTime(start)} às ${formatTime(end)}`;
  }

  return `${startDate} ${formatTime(start)} a ${endDate} ${formatTime(end)}`;
}

function toLocalDatetimeInput(d: string | Date): string {
  const date = new Date(d);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function toLocalDateInput(d: string | Date): string {
  const date = new Date(d);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function isBlockedTimePast(bt: BlockedTime): boolean {
  return new Date(bt.endDatetime) < new Date();
}

function isBlockedTimeActive(bt: BlockedTime): boolean {
  const now = new Date();
  return new Date(bt.startDatetime) <= now && new Date(bt.endDatetime) >= now;
}

// ============================================================
// FORM COMPONENT
// ============================================================
function BlockedTimeForm({
  initialData,
  professionals,
  onSubmit,
  isSubmitting,
}: {
  initialData?: BlockedTime;
  professionals: Array<{ id: number; name: string }>;
  onSubmit: (data: {
    professionalId?: number;
    title: string;
    reason?: string;
    startDatetime: string;
    endDatetime: string;
    isAllDay: boolean;
  }) => void;
  isSubmitting: boolean;
}) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [reason, setReason] = useState(initialData?.reason ?? "");
  const [professionalId, setProfessionalId] = useState<string>(
    initialData?.professionalId?.toString() ?? "all"
  );
  const [isAllDay, setIsAllDay] = useState(initialData?.isAllDay ?? false);
  const [startDatetime, setStartDatetime] = useState(
    initialData ? toLocalDatetimeInput(initialData.startDatetime) : ""
  );
  const [endDatetime, setEndDatetime] = useState(
    initialData ? toLocalDatetimeInput(initialData.endDatetime) : ""
  );
  const [startDate, setStartDate] = useState(
    initialData ? toLocalDateInput(initialData.startDatetime) : ""
  );
  const [endDate, setEndDate] = useState(
    initialData ? toLocalDateInput(initialData.endDatetime) : ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Título é obrigatório.");
      return;
    }

    let start: string;
    let end: string;

    if (isAllDay) {
      if (!startDate || !endDate) {
        toast.error("Selecione as datas de início e término.");
        return;
      }
      start = new Date(`${startDate}T00:00:00`).toISOString();
      end = new Date(`${endDate}T23:59:59`).toISOString();
    } else {
      if (!startDatetime || !endDatetime) {
        toast.error("Selecione data/hora de início e término.");
        return;
      }
      start = new Date(startDatetime).toISOString();
      end = new Date(endDatetime).toISOString();
    }

    if (new Date(end) <= new Date(start)) {
      toast.error("Data/hora de término deve ser posterior à de início.");
      return;
    }

    onSubmit({
      professionalId: professionalId !== "all" ? parseInt(professionalId) : undefined,
      title: title.trim(),
      reason: reason.trim() || undefined,
      startDatetime: start,
      endDatetime: end,
      isAllDay,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Férias, Folga, Consulta médica"
          maxLength={200}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="professional">Profissional</Label>
        <Select value={professionalId} onValueChange={setProfessionalId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os profissionais</SelectItem>
            {professionals.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Deixe em "Todos" para bloquear o estabelecimento inteiro.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="isAllDay"
          checked={isAllDay}
          onCheckedChange={setIsAllDay}
        />
        <Label htmlFor="isAllDay">Dia inteiro</Label>
      </div>

      {isAllDay ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Data início *</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">Data término *</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDatetime">Início *</Label>
            <Input
              id="startDatetime"
              type="datetime-local"
              value={startDatetime}
              onChange={(e) => setStartDatetime(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDatetime">Término *</Label>
            <Input
              id="endDatetime"
              type="datetime-local"
              value={endDatetime}
              onChange={(e) => setEndDatetime(e.target.value)}
              required
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reason">Motivo (opcional)</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Descreva o motivo do bloqueio..."
          maxLength={255}
          rows={2}
        />
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Salvar alterações" : "Criar bloqueio"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function BlockedTimesPage() {
  const [filterProfId, setFilterProfId] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BlockedTime | null>(null);

  const utils = trpc.useUtils();

  const { data: professionals = [], isLoading: loadingProfs } =
    trpc.professional.list.useQuery();

  const { data: blockedTimes = [], isLoading: loadingBlocked } =
    trpc.blockedTime.list.useQuery(
      filterProfId !== "all"
        ? { professionalId: parseInt(filterProfId), activeOnly: false }
        : { activeOnly: false }
    );

  const createMutation = trpc.blockedTime.create.useMutation({
    onSuccess: () => {
      toast.success("Bloqueio criado com sucesso!");
      setIsCreateOpen(false);
      utils.blockedTime.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao criar bloqueio.");
    },
  });

  const updateMutation = trpc.blockedTime.update.useMutation({
    onSuccess: () => {
      toast.success("Bloqueio atualizado com sucesso!");
      setEditingItem(null);
      utils.blockedTime.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao atualizar bloqueio.");
    },
  });

  const deleteMutation = trpc.blockedTime.delete.useMutation({
    onSuccess: () => {
      toast.success("Bloqueio removido com sucesso!");
      utils.blockedTime.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao remover bloqueio.");
    },
  });

  // Map professionalId to name
  const profMap = useMemo(() => {
    const map = new Map<number, string>();
    professionals.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [professionals]);

  const isLoading = loadingProfs || loadingBlocked;

  // Separate active, past, and inactive
  const { upcoming, active, past, inactive } = useMemo(() => {
    const upcoming: BlockedTime[] = [];
    const active: BlockedTime[] = [];
    const past: BlockedTime[] = [];
    const inactive: BlockedTime[] = [];

    (blockedTimes as BlockedTime[]).forEach((bt) => {
      if (!bt.isActive) {
        inactive.push(bt);
      } else if (isBlockedTimePast(bt)) {
        past.push(bt);
      } else if (isBlockedTimeActive(bt)) {
        active.push(bt);
      } else {
        upcoming.push(bt);
      }
    });

    return { upcoming, active, past, inactive };
  }, [blockedTimes]);

  const renderCard = (bt: BlockedTime, showStatus = true) => (
    <Card
      key={bt.id}
      className={`transition-all ${
        !bt.isActive
          ? "opacity-50 border-dashed"
          : isBlockedTimePast(bt)
          ? "opacity-70"
          : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Ban className="h-4 w-4 text-destructive shrink-0" />
              <h3 className="font-semibold text-sm truncate">{bt.title}</h3>
              {showStatus && (
                <>
                  {!bt.isActive && (
                    <Badge variant="outline" className="text-xs">
                      Removido
                    </Badge>
                  )}
                  {bt.isActive && isBlockedTimeActive(bt) && (
                    <Badge variant="destructive" className="text-xs">
                      Ativo agora
                    </Badge>
                  )}
                  {bt.isActive && isBlockedTimePast(bt) && (
                    <Badge variant="secondary" className="text-xs">
                      Encerrado
                    </Badge>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              <span>
                {formatDateRange(bt.startDatetime, bt.endDatetime, bt.isAllDay)}
              </span>
            </div>

            {bt.professionalId ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <User className="h-3 w-3" />
                <span>{profMap.get(bt.professionalId) ?? "Profissional"}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <User className="h-3 w-3" />
                <span className="italic">Todo o estabelecimento</span>
              </div>
            )}

            {bt.reason && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {bt.reason}
              </p>
            )}
          </div>

          {bt.isActive && (
            <div className="flex gap-1 shrink-0">
              <Dialog
                open={editingItem?.id === bt.id}
                onOpenChange={(open) => {
                  if (!open) setEditingItem(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingItem(bt)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar bloqueio</DialogTitle>
                  </DialogHeader>
                  <BlockedTimeForm
                    initialData={bt}
                    professionals={professionals.map((p) => ({
                      id: p.id,
                      name: p.name,
                    }))}
                    onSubmit={(data) =>
                      updateMutation.mutate({ id: bt.id, ...data })
                    }
                    isSubmitting={updateMutation.isPending}
                  />
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover bloqueio?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O bloqueio "{bt.title}" será desativado. Essa ação pode
                      ser revertida.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate({ id: bt.id })}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">
            Bloqueios de Horário
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie férias, folgas e outros bloqueios de agenda.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo bloqueio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar bloqueio de horário</DialogTitle>
            </DialogHeader>
            <BlockedTimeForm
              professionals={professionals.map((p) => ({
                id: p.id,
                name: p.name,
              }))}
              onSubmit={(data) => createMutation.mutate(data)}
              isSubmitting={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterProfId} onValueChange={setFilterProfId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filtrar por profissional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os profissionais</SelectItem>
            {professionals.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : blockedTimes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ban className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">
              Nenhum bloqueio cadastrado
            </h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Bloqueios de horário permitem marcar períodos em que profissionais
              não estão disponíveis (férias, folgas, compromissos pessoais).
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar primeiro bloqueio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active now */}
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Ativos agora ({active.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((bt) => renderCard(bt, false))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Próximos ({upcoming.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((bt) => renderCard(bt, false))}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                Encerrados ({past.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((bt) => renderCard(bt))}
              </div>
            </div>
          )}

          {/* Inactive / removed */}
          {inactive.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                Removidos ({inactive.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {inactive.map((bt) => renderCard(bt))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
