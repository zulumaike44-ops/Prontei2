import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  UserCircle,
  Phone,
  Mail,
  Search,
  MoreHorizontal,
  AlertTriangle,
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
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

type Professional = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  isActive: boolean;
  displayOrder: number;
};

// ============================================================
// PROFESSIONAL FORM (shared between create and edit)
// ============================================================
function ProfessionalForm({
  open,
  onOpenChange,
  professional,
  establishmentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professional?: Professional | null;
  establishmentId?: number;
}) {
  const isEditing = !!professional;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const utils = trpc.useUtils();

  const createMutation = trpc.professional.create.useMutation({
    onSuccess: () => {
      utils.professional.list.invalidate();
      utils.professional.count.invalidate();
      onOpenChange(false);
      toast.success("Profissional cadastrado com sucesso!");
    },
    onError: (error) => {
      if (error.message.includes("Limite")) {
        toast.error(error.message);
      } else if (error.message.includes("Duplicate")) {
        setErrors({ email: "Este e-mail já está cadastrado para outro profissional." });
      } else {
        toast.error("Erro ao cadastrar profissional. Tente novamente.");
      }
    },
  });

  const updateMutation = trpc.professional.update.useMutation({
    onSuccess: () => {
      utils.professional.list.invalidate();
      onOpenChange(false);
      toast.success("Profissional atualizado com sucesso!");
    },
    onError: (error) => {
      if (error.message.includes("Duplicate")) {
        setErrors({ email: "Este e-mail já está cadastrado para outro profissional." });
      } else {
        toast.error("Erro ao atualizar profissional. Tente novamente.");
      }
    },
  });

  useEffect(() => {
    if (open) {
      setName(professional?.name ?? "");
      setEmail(professional?.email ?? "");
      setPhone(professional?.phone ?? "");
      setBio(professional?.bio ?? "");
      setErrors({});
    }
  }, [open, professional]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = "Nome deve ter pelo menos 2 caracteres.";
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "E-mail inválido.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (isEditing && professional) {
      updateMutation.mutate({
        id: professional.id,
        name: name.trim(),
        email: email.trim() || "",
        phone: phone.trim() || "",
        bio: bio.trim() || "",
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        email: email.trim() || "",
        phone: phone.trim() || "",
        bio: bio.trim() || "",
      });
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {isEditing ? "Editar profissional" : "Novo profissional"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados do profissional."
              : "Preencha os dados para cadastrar um novo profissional."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="prof-name">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="prof-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Maria Silva"
              maxLength={150}
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prof-email">E-mail</Label>
              <Input
                id="prof-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maria@email.com"
                maxLength={255}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="prof-phone">Telefone</Label>
              <Input
                id="prof-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-0000"
                maxLength={20}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prof-bio">Sobre</Label>
            <Textarea
              id="prof-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Breve descrição do profissional (opcional)"
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
export default function Professionals() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const {
    data: establishment,
    isLoading: estLoading,
  } = trpc.establishment.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const {
    data: professionalsList,
    isLoading: profsLoading,
  } = trpc.professional.list.useQuery(undefined, {
    enabled: isAuthenticated && !!establishment,
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] =
    useState<Professional | null>(null);
  const [deletingProfessional, setDeletingProfessional] =
    useState<Professional | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const utils = trpc.useUtils();

  const deleteMutation = trpc.professional.delete.useMutation({
    onSuccess: () => {
      utils.professional.list.invalidate();
      utils.professional.count.invalidate();
      setDeletingProfessional(null);
      toast.success("Profissional removido com sucesso.");
    },
    onError: () => {
      toast.error("Erro ao remover profissional. Tente novamente.");
    },
  });

  // Redirect to onboarding if needed
  useEffect(() => {
    if (!authLoading && !estLoading) {
      if (establishment && !establishment.onboardingCompleted) {
        setLocation("/onboarding");
      }
    }
  }, [authLoading, estLoading, establishment, setLocation]);

  const isLoading = authLoading || estLoading || profsLoading;

  const filteredProfessionals = (professionalsList ?? []).filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.phone && p.phone.includes(searchTerm))
  );

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
              Profissionais
            </h1>
            <p className="text-muted-foreground">
              Gerencie a equipe do{" "}
              <strong>{establishment.name}</strong>.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingProfessional(null);
              setIsFormOpen(true);
            }}
            className="bg-primary hover:bg-terracotta-dark text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo profissional
          </Button>
        </div>

        {/* Search */}
        {(professionalsList ?? []).length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Empty State */}
        {(professionalsList ?? []).length === 0 && (
          <div className="bg-card rounded-xl border border-border/50 p-12 shadow-sm">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-teal/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-teal" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                Nenhum profissional cadastrado
              </h3>
              <p className="text-muted-foreground mb-6">
                Cadastre os profissionais que atendem no seu estabelecimento.
                Eles aparecerão na agenda e poderão receber agendamentos.
              </p>
              <Button
                onClick={() => {
                  setEditingProfessional(null);
                  setIsFormOpen(true);
                }}
                className="bg-primary hover:bg-terracotta-dark text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar primeiro profissional
              </Button>
            </div>
          </div>
        )}

        {/* Professionals List */}
        {filteredProfessionals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProfessionals.map((prof) => (
              <div
                key={prof.id}
                className={`bg-card rounded-xl border border-border/50 p-5 shadow-sm transition-all hover:shadow-md ${
                  !prof.isActive ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border border-border/50">
                      <AvatarFallback className="text-sm font-medium bg-teal/10 text-teal">
                        {prof.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="font-heading font-semibold text-foreground truncate">
                        {prof.name}
                      </h3>
                      {!prof.isActive && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          Inativo
                        </span>
                      )}
                    </div>
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
                          setEditingProfessional(prof);
                          setIsFormOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeletingProfessional(prof)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 text-sm">
                  {prof.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{prof.email}</span>
                    </div>
                  )}
                  {prof.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{prof.phone}</span>
                    </div>
                  )}
                  {!prof.email && !prof.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground/50">
                      <UserCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="italic">Sem contato cadastrado</span>
                    </div>
                  )}
                </div>

                {prof.bio && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                    {prof.bio}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No results from search */}
        {(professionalsList ?? []).length > 0 &&
          filteredProfessionals.length === 0 &&
          searchTerm && (
            <div className="text-center py-12">
              <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Nenhum profissional encontrado para "{searchTerm}".
              </p>
            </div>
          )}
      </div>

      {/* Create/Edit Dialog */}
      <ProfessionalForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        professional={editingProfessional}
        establishmentId={establishment.id}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingProfessional}
        onOpenChange={(open) => {
          if (!open) setDeletingProfessional(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remover profissional
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{" "}
              <strong>{deletingProfessional?.name}</strong>? Esta ação não pode
              ser desfeita. Agendamentos futuros deste profissional precisarão
              ser remanejados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingProfessional) {
                  deleteMutation.mutate({ id: deletingProfessional.id });
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
