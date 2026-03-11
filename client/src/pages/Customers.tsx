import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Phone,
  Mail,
  Search,
  MoreHorizontal,
  UserCircle,
  StickyNote,
  UserX,
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type Customer = {
  id: number;
  name: string;
  phone: string;
  normalizedPhone: string;
  email: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatPhone(phone: string): string {
  // Try to format Brazilian phone numbers
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Stabilize search input for query
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimeout = useMemo(() => {
    return (value: string) => {
      const timer = setTimeout(() => setDebouncedSearch(value), 300);
      return () => clearTimeout(timer);
    };
  }, []);

  const queryInput = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      activeOnly: !showInactive,
    }),
    [debouncedSearch, showInactive]
  );

  const { data: customers, isLoading, refetch } = trpc.customer.list.useQuery(queryInput);
  const utils = trpc.useUtils();

  const createMutation = trpc.customer.create.useMutation({
    onSuccess: () => {
      toast.success("Cliente cadastrado com sucesso!");
      closeDialog();
      utils.customer.list.invalidate();
      utils.customer.count.invalidate();
    },
    onError: (err) => {
      if (err.message.includes("telefone")) {
        setFormErrors({ phone: err.message });
      } else {
        toast.error(err.message);
      }
    },
  });

  const updateMutation = trpc.customer.update.useMutation({
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso!");
      closeDialog();
      utils.customer.list.invalidate();
    },
    onError: (err) => {
      if (err.message.includes("telefone")) {
        setFormErrors({ phone: err.message });
      } else {
        toast.error(err.message);
      }
    },
  });

  const deleteMutation = trpc.customer.delete.useMutation({
    onSuccess: () => {
      toast.success("Cliente desativado com sucesso.");
      setDeleteTarget(null);
      utils.customer.list.invalidate();
      utils.customer.count.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function openCreateDialog() {
    setEditingCustomer(null);
    setFormData({ name: "", phone: "", email: "", notes: "" });
    setFormErrors({});
    setDialogOpen(true);
  }

  function openEditDialog(customer: Customer) {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? "",
      notes: customer.notes ?? "",
    });
    setFormErrors({});
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingCustomer(null);
    setFormData({ name: "", phone: "", email: "", notes: "" });
    setFormErrors({});
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = "Nome deve ter pelo menos 2 caracteres.";
    }

    if (!formData.phone.trim() || formData.phone.replace(/\D/g, "").length < 8) {
      errors.phone = "Telefone deve ter pelo menos 8 dígitos.";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "E-mail inválido.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (!validateForm()) return;

    if (editingCustomer) {
      updateMutation.mutate({
        id: editingCustomer.id,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || "",
        notes: formData.notes.trim() || "",
      });
    } else {
      createMutation.mutate({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || "",
        notes: formData.notes.trim() || "",
      });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Clientes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os clientes do seu estabelecimento
            </p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo cliente
          </Button>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                searchTimeout(e.target.value);
              }}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={showInactive}
              onCheckedChange={setShowInactive}
              id="show-inactive"
            />
            <Label htmlFor="show-inactive" className="text-sm text-muted-foreground whitespace-nowrap">
              Mostrar inativos
            </Label>
          </div>
        </div>

        {/* Customer list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Carregando clientes...</span>
          </div>
        ) : !customers || customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <UserX className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
              {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchTerm
                ? "Tente buscar com outro nome ou telefone."
                : "Cadastre seus clientes para facilitar os agendamentos."}
            </p>
            {!searchTerm && (
              <Button onClick={openCreateDialog} className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Cadastrar primeiro cliente
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              {customers.length} cliente{customers.length !== 1 ? "s" : ""} encontrado{customers.length !== 1 ? "s" : ""}
            </p>
            {customers.map((customer: Customer) => (
              <div
                key={customer.id}
                className={`group flex items-center gap-4 p-4 rounded-xl border bg-card transition-colors hover:bg-accent/5 ${
                  !customer.isActive ? "opacity-60" : ""
                }`}
              >
                {/* Avatar */}
                <Avatar className="w-11 h-11 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {getInitials(customer.name)}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground truncate">
                      {customer.name}
                    </h3>
                    {!customer.isActive && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      {formatPhone(customer.phone)}
                    </span>
                    {customer.email && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[200px]">{customer.email}</span>
                      </span>
                    )}
                    {customer.notes && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <StickyNote className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[200px]">{customer.notes}</span>
                      </span>
                    )}
                  </div>
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
                    <DropdownMenuItem onClick={() => openEditDialog(customer)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    {customer.isActive && (
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(customer)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Desativar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingCustomer ? "Editar cliente" : "Novo cliente"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? "Atualize os dados do cliente."
                : "Preencha os dados para cadastrar um novo cliente."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="customer-name">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customer-name"
                placeholder="Nome completo do cliente"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  setFormErrors({ ...formErrors, name: "" });
                }}
                className={formErrors.name ? "border-destructive" : ""}
              />
              {formErrors.name && (
                <p className="text-xs text-destructive">{formErrors.name}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="customer-phone">
                Telefone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customer-phone"
                placeholder="(11) 99999-1234"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  setFormErrors({ ...formErrors, phone: "" });
                }}
                className={formErrors.phone ? "border-destructive" : ""}
              />
              {formErrors.phone && (
                <p className="text-xs text-destructive">{formErrors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="customer-email">E-mail</Label>
              <Input
                id="customer-email"
                type="email"
                placeholder="cliente@email.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setFormErrors({ ...formErrors, email: "" });
                }}
                className={formErrors.email ? "border-destructive" : ""}
              />
              {formErrors.email && (
                <p className="text-xs text-destructive">{formErrors.email}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="customer-notes">Observações</Label>
              <Textarea
                id="customer-notes"
                placeholder="Informações adicionais sobre o cliente..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCustomer ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente <strong>{deleteTarget?.name}</strong> será desativado e
              não aparecerá mais na listagem padrão. Você pode reativá-lo
              posteriormente editando seus dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate({ id: deleteTarget.id });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
