import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import {
  Scissors,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  DollarSign,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type ServiceItem = {
  id: number;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  category: string | null;
  isActive: boolean;
  displayOrder: number;
};

// ============================================================
// HELPERS
// ============================================================
function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (isNaN(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

// ============================================================
// SERVICE FORM
// ============================================================
function ServiceForm({
  open,
  onOpenChange,
  service,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ServiceItem | null;
}) {
  const isEditing = !!service;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [price, setPrice] = useState("0");
  const [category, setCategory] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const utils = trpc.useUtils();

  const createMutation = trpc.service.create.useMutation({
    onSuccess: () => {
      utils.service.list.invalidate();
      utils.service.count.invalidate();
      onOpenChange(false);
      toast.success("Serviço cadastrado com sucesso!");
    },
    onError: (error) => {
      if (error.message.includes("Limite")) {
        toast.error(error.message);
      } else {
        toast.error("Erro ao cadastrar serviço. Tente novamente.");
      }
    },
  });

  const updateMutation = trpc.service.update.useMutation({
    onSuccess: () => {
      utils.service.list.invalidate();
      onOpenChange(false);
      toast.success("Serviço atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar serviço. Tente novamente.");
    },
  });

  useEffect(() => {
    if (open) {
      setName(service?.name ?? "");
      setDescription(service?.description ?? "");
      setDurationMinutes(service?.durationMinutes?.toString() ?? "30");
      setPrice(service?.price ?? "0");
      setCategory(service?.category ?? "");
      setErrors({});
    }
  }, [open, service]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = "Nome deve ter pelo menos 2 caracteres.";
    }
    const dur = parseInt(durationMinutes, 10);
    if (isNaN(dur) || dur <= 0) {
      newErrors.durationMinutes = "Duração deve ser maior que zero.";
    }
    if (dur > 480) {
      newErrors.durationMinutes = "Duração máxima de 8 horas (480 minutos).";
    }
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) {
      newErrors.price = "Preço deve ser um valor numérico >= 0.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (isEditing && service) {
      updateMutation.mutate({
        id: service.id,
        name: name.trim(),
        description: description.trim() || "",
        durationMinutes: parseInt(durationMinutes, 10),
        price: parseFloat(price).toFixed(2),
        category: category.trim() || "",
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || "",
        durationMinutes: parseInt(durationMinutes, 10),
        price: parseFloat(price).toFixed(2),
        category: category.trim() || "",
      });
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {isEditing ? "Editar serviço" : "Novo serviço"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados do serviço."
              : "Preencha os dados para cadastrar um novo serviço."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="svc-name">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="svc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Corte masculino"
              maxLength={200}
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="svc-duration">
                Duração (minutos) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="svc-duration"
                type="number"
                min={1}
                max={480}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="30"
              />
              {errors.durationMinutes && (
                <p className="text-sm text-destructive">
                  {errors.durationMinutes}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-price">
                Preço (R$) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="svc-price"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="50.00"
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="svc-category">Categoria</Label>
            <Input
              id="svc-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: Cabelo, Barba, Unha..."
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="svc-description">Descrição</Label>
            <Textarea
              id="svc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do serviço (opcional)"
              maxLength={500}
              rows={3}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-terracotta-dark text-primary-foreground"
            >
              {isSubmitting && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isEditing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function Services() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: establishment, isLoading: estLoading } =
    trpc.establishment.mine.useQuery(undefined, {
      enabled: isAuthenticated,
    });

  const { data: servicesList, isLoading: svcsLoading } =
    trpc.service.list.useQuery(undefined, {
      enabled: isAuthenticated && !!establishment,
    });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(
    null
  );
  const [deletingService, setDeletingService] = useState<ServiceItem | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");

  const utils = trpc.useUtils();

  const deleteMutation = trpc.service.delete.useMutation({
    onSuccess: () => {
      utils.service.list.invalidate();
      utils.service.count.invalidate();
      setDeletingService(null);
      toast.success("Serviço removido com sucesso.");
    },
    onError: () => {
      toast.error("Erro ao remover serviço. Tente novamente.");
    },
  });

  useEffect(() => {
    if (!authLoading && !estLoading) {
      if (establishment && !establishment.onboardingCompleted) {
        setLocation("/onboarding");
      }
    }
  }, [authLoading, estLoading, establishment, setLocation]);

  const isLoading = authLoading || estLoading || svcsLoading;

  const filteredServices = (servicesList ?? []).filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group by category
  const categories = new Map<string, ServiceItem[]>();
  for (const svc of filteredServices) {
    const cat = svc.category || "Sem categoria";
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(svc as ServiceItem);
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!establishment) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <p className="text-muted-foreground">
            Complete o onboarding para acessar esta página.
          </p>
          <Button onClick={() => setLocation("/onboarding")}>
            Ir para onboarding
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Serviços
            </h1>
            <p className="text-muted-foreground">
              Gerencie os serviços oferecidos pelo{" "}
              <strong>{establishment.name}</strong>.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingService(null);
              setIsFormOpen(true);
            }}
            className="bg-primary hover:bg-terracotta-dark text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo serviço
          </Button>
        </div>

        {/* Search */}
        {(servicesList ?? []).length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Empty State */}
        {(servicesList ?? []).length === 0 && (
          <div className="bg-card rounded-xl border border-border/50 p-12 shadow-sm">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-teal/10 flex items-center justify-center mx-auto mb-4">
                <Scissors className="w-8 h-8 text-teal" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                Nenhum serviço cadastrado
              </h3>
              <p className="text-muted-foreground mb-6">
                Cadastre os serviços que seu estabelecimento oferece. Eles
                poderão ser vinculados aos profissionais e usados nos
                agendamentos.
              </p>
              <Button
                onClick={() => {
                  setEditingService(null);
                  setIsFormOpen(true);
                }}
                className="bg-primary hover:bg-terracotta-dark text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar primeiro serviço
              </Button>
            </div>
          </div>
        )}

        {/* Services List — grouped by category */}
        {Array.from(categories.entries()).map(([catName, catServices]) => (
          <div key={catName} className="space-y-3">
            <h2 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {catName}
            </h2>
            <div className="space-y-2">
              {catServices.map((svc) => (
                <div
                  key={svc.id}
                  className={`bg-card rounded-xl border border-border/50 p-4 shadow-sm transition-all hover:shadow-md flex items-center justify-between gap-4 ${
                    !svc.isActive ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Scissors className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-semibold text-foreground truncate">
                          {svc.name}
                        </h3>
                        {!svc.isActive && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                            Inativo
                          </span>
                        )}
                      </div>
                      {svc.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {svc.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDuration(svc.durationMinutes)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold text-foreground min-w-[80px] justify-end">
                      <DollarSign className="w-3.5 h-3.5 text-teal" />
                      <span>{formatPrice(svc.price)}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingService(svc);
                            setIsFormOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingService(svc)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* No results from search */}
        {(servicesList ?? []).length > 0 &&
          filteredServices.length === 0 &&
          searchTerm && (
            <div className="text-center py-12">
              <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Nenhum serviço encontrado para "{searchTerm}".
              </p>
            </div>
          )}
      </div>

      {/* Create/Edit Dialog */}
      <ServiceForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        service={editingService}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingService}
        onOpenChange={(open) => {
          if (!open) setDeletingService(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remover serviço
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{" "}
              <strong>{deletingService?.name}</strong>? Profissionais vinculados
              a este serviço perderão o vínculo. Agendamentos futuros com este
              serviço precisarão ser remanejados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingService) {
                  deleteMutation.mutate({ id: deletingService.id });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
