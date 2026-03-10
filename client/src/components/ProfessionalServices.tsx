import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Scissors,
  Plus,
  X,
  Loader2,
  Clock,
  DollarSign,
  Pencil,
  Check,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type ProfessionalServiceLink = {
  linkId: number;
  professionalId: number;
  serviceId: number;
  customPrice: string | null;
  customDurationMinutes: number | null;
  isActive: boolean;
  serviceName: string;
  servicePrice: string;
  serviceDurationMinutes: number;
  serviceIsActive: boolean;
};

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
// ADD SERVICE DIALOG
// ============================================================
function AddServiceDialog({
  open,
  onOpenChange,
  professionalId,
  existingServiceIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionalId: number;
  existingServiceIds: Set<number>;
}) {
  const { data: allServices } = trpc.service.list.useQuery();
  const [selectedServices, setSelectedServices] = useState<Set<number>>(
    new Set()
  );

  const utils = trpc.useUtils();

  const linkMutation = trpc.professional.linkService.useMutation({
    onSuccess: () => {
      utils.professional.services.invalidate({ professionalId });
    },
  });

  const availableServices = (allServices ?? []).filter(
    (s) => s.isActive && !existingServiceIds.has(s.id)
  );

  function toggleService(serviceId: number) {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  }

  async function handleAdd() {
    const promises = Array.from(selectedServices).map((serviceId) =>
      linkMutation.mutateAsync({ professionalId, serviceId })
    );

    try {
      await Promise.all(promises);
      toast.success(
        `${selectedServices.size} serviço(s) vinculado(s) com sucesso!`
      );
      setSelectedServices(new Set());
      onOpenChange(false);
    } catch {
      toast.error("Erro ao vincular serviços. Tente novamente.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setSelectedServices(new Set());
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            Vincular serviços
          </DialogTitle>
          <DialogDescription>
            Selecione os serviços que este profissional realiza.
          </DialogDescription>
        </DialogHeader>

        {availableServices.length === 0 ? (
          <div className="py-8 text-center">
            <Scissors className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Todos os serviços já estão vinculados a este profissional, ou
              nenhum serviço foi cadastrado ainda.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto py-2">
            {availableServices.map((svc) => (
              <label
                key={svc.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedServices.has(svc.id)
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:bg-muted/50"
                }`}
              >
                <Checkbox
                  checked={selectedServices.has(svc.id)}
                  onCheckedChange={() => toggleService(svc.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {svc.name}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(svc.durationMinutes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {formatPrice(svc.price)}
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSelectedServices(new Set());
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selectedServices.size === 0 || linkMutation.isPending}
            className="bg-primary hover:bg-terracotta-dark text-primary-foreground"
          >
            {linkMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Vincular ({selectedServices.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// CUSTOMIZE DIALOG
// ============================================================
function CustomizeDialog({
  open,
  onOpenChange,
  link,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: ProfessionalServiceLink | null;
}) {
  const [customPrice, setCustomPrice] = useState("");
  const [customDuration, setCustomDuration] = useState("");
  const utils = trpc.useUtils();

  const updateMutation = trpc.professional.linkService.useMutation({
    onSuccess: () => {
      if (link) {
        utils.professional.services.invalidate({
          professionalId: link.professionalId,
        });
      }
      onOpenChange(false);
      toast.success("Valores personalizados salvos!");
    },
    onError: () => {
      toast.error("Erro ao salvar. Tente novamente.");
    },
  });

  // Reset form when dialog opens
  if (open && link) {
    if (customPrice === "" && customDuration === "") {
      // Only set on first open
      setTimeout(() => {
        setCustomPrice(link.customPrice ?? "");
        setCustomDuration(
          link.customDurationMinutes?.toString() ?? ""
        );
      }, 0);
    }
  }

  function handleSave() {
    if (!link) return;

    const priceVal = customPrice.trim() || undefined;
    const durVal = customDuration.trim()
      ? parseInt(customDuration, 10)
      : undefined;

    if (durVal !== undefined && (isNaN(durVal) || durVal <= 0)) {
      toast.error("Duração personalizada deve ser maior que zero.");
      return;
    }

    if (
      priceVal !== undefined &&
      (isNaN(parseFloat(priceVal)) || parseFloat(priceVal) < 0)
    ) {
      toast.error("Preço personalizado deve ser >= 0.");
      return;
    }

    updateMutation.mutate({
      professionalId: link.professionalId,
      serviceId: link.serviceId,
      customPrice: priceVal ? parseFloat(priceVal).toFixed(2) : undefined,
      customDurationMinutes: durVal,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setCustomPrice("");
          setCustomDuration("");
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            Personalizar valores
          </DialogTitle>
          <DialogDescription>
            {link?.serviceName} — valores padrão:{" "}
            {formatPrice(link?.servicePrice ?? "0")} /{" "}
            {formatDuration(link?.serviceDurationMinutes ?? 0)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="custom-price">Preço personalizado (R$)</Label>
            <Input
              id="custom-price"
              type="number"
              min={0}
              step="0.01"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder={`Padrão: ${link?.servicePrice ?? "0"}`}
            />
            <p className="text-xs text-muted-foreground">
              Deixe vazio para usar o preço padrão do serviço.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-duration">
              Duração personalizada (minutos)
            </Label>
            <Input
              id="custom-duration"
              type="number"
              min={1}
              max={480}
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              placeholder={`Padrão: ${link?.serviceDurationMinutes ?? 0}`}
            />
            <p className="text-xs text-muted-foreground">
              Deixe vazio para usar a duração padrão do serviço.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCustomPrice("");
              setCustomDuration("");
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-primary hover:bg-terracotta-dark text-primary-foreground"
          >
            {updateMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function ProfessionalServices({
  professionalId,
  professionalName,
}: {
  professionalId: number;
  professionalName: string;
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [customizingLink, setCustomizingLink] =
    useState<ProfessionalServiceLink | null>(null);

  const { data: links, isLoading } = trpc.professional.services.useQuery(
    { professionalId },
    { enabled: !!professionalId }
  );

  const utils = trpc.useUtils();

  const unlinkMutation = trpc.professional.unlinkService.useMutation({
    onSuccess: () => {
      utils.professional.services.invalidate({ professionalId });
      toast.success("Vínculo removido.");
    },
    onError: () => {
      toast.error("Erro ao remover vínculo.");
    },
  });

  const existingServiceIds = new Set(
    (links ?? []).map((l) => l.serviceId)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Serviços de {professionalName}
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAddOpen(true)}
          className="text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Vincular serviço
        </Button>
      </div>

      {(links ?? []).length === 0 ? (
        <div className="text-center py-6 bg-muted/30 rounded-lg border border-dashed border-border/50">
          <Scissors className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum serviço vinculado.
          </p>
          <Button
            size="sm"
            variant="link"
            onClick={() => setIsAddOpen(true)}
            className="text-primary mt-1"
          >
            Vincular serviços
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {(links ?? []).map((link) => {
            const effectivePrice = link.customPrice ?? link.servicePrice;
            const effectiveDuration =
              link.customDurationMinutes ?? link.serviceDurationMinutes;
            const hasCustom =
              link.customPrice !== null ||
              link.customDurationMinutes !== null;

            return (
              <div
                key={link.linkId}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/50 bg-card"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Scissors className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {link.serviceName}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(effectiveDuration)}
                        {link.customDurationMinutes !== null && (
                          <span className="text-primary font-medium">
                            (custom)
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {formatPrice(effectivePrice)}
                        {link.customPrice !== null && (
                          <span className="text-primary font-medium">
                            (custom)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setCustomizingLink(link as ProfessionalServiceLink)
                    }
                    title="Personalizar preço/duração"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      unlinkMutation.mutate({
                        professionalId: link.professionalId,
                        serviceId: link.serviceId,
                      })
                    }
                    disabled={unlinkMutation.isPending}
                    title="Remover vínculo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Service Dialog */}
      <AddServiceDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        professionalId={professionalId}
        existingServiceIds={existingServiceIds}
      />

      {/* Customize Dialog */}
      <CustomizeDialog
        open={!!customizingLink}
        onOpenChange={(o) => {
          if (!o) setCustomizingLink(null);
        }}
        link={customizingLink}
      />
    </div>
  );
}
