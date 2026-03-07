import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { Loader2, Save, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { isAuthenticated } = useAuth();

  const {
    data: establishment,
    isLoading,
    refetch,
  } = trpc.establishment.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const updateMutation = trpc.establishment.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Dados atualizados com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro ao salvar", { description: err.message });
    },
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressZipcode, setAddressZipcode] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");

  useEffect(() => {
    if (establishment) {
      setName(establishment.name || "");
      setDescription(establishment.description || "");
      setPhone(establishment.phone || "");
      setEmail(establishment.email || "");
      setAddressZipcode(establishment.addressZipcode || "");
      setAddressStreet(establishment.addressStreet || "");
      setAddressNumber(establishment.addressNumber || "");
      setAddressComplement(establishment.addressComplement || "");
      setAddressNeighborhood(establishment.addressNeighborhood || "");
      setAddressCity(establishment.addressCity || "");
      setAddressState(establishment.addressState || "");
    }
  }, [establishment]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("O nome do estabelecimento é obrigatório.");
      return;
    }

    updateMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      addressZipcode: addressZipcode.trim() || undefined,
      addressStreet: addressStreet.trim() || undefined,
      addressNumber: addressNumber.trim() || undefined,
      addressComplement: addressComplement.trim() || undefined,
      addressNeighborhood: addressNeighborhood.trim() || undefined,
      addressCity: addressCity.trim() || undefined,
      addressState: addressState.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Configurações
          </h1>
          <p className="text-muted-foreground">
            Gerencie as informações do seu estabelecimento.
          </p>
        </div>

        {/* Profile Section */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-semibold">
                  Dados do estabelecimento
                </h2>
                <p className="text-sm text-muted-foreground">
                  Informações visíveis para seus clientes.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="settings-name" className="text-sm font-medium">
                Nome do negócio *
              </Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-desc" className="text-sm font-medium">
                Descrição
              </Label>
              <textarea
                id="settings-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Uma breve descrição do seu negócio..."
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="settings-phone" className="text-sm font-medium">
                  Telefone / WhatsApp
                </Label>
                <Input
                  id="settings-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-email" className="text-sm font-medium">
                  E-mail
                </Label>
                <Input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            {/* Address */}
            <div className="pt-4 border-t border-border/30">
              <h3 className="font-heading text-base font-semibold mb-4">
                Endereço
              </h3>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">CEP</Label>
                    <Input
                      value={addressZipcode}
                      onChange={(e) => setAddressZipcode(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Estado</Label>
                    <Input
                      maxLength={2}
                      value={addressState}
                      onChange={(e) =>
                        setAddressState(e.target.value.toUpperCase())
                      }
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Cidade</Label>
                  <Input
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Bairro</Label>
                  <Input
                    value={addressNeighborhood}
                    onChange={(e) => setAddressNeighborhood(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-2">
                    <Label className="text-sm font-medium">Rua</Label>
                    <Input
                      value={addressStreet}
                      onChange={(e) => setAddressStreet(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Número</Label>
                    <Input
                      value={addressNumber}
                      onChange={(e) => setAddressNumber(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Complemento</Label>
                  <Input
                    value={addressComplement}
                    onChange={(e) => setAddressComplement(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-border/50 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-primary hover:bg-terracotta-dark text-primary-foreground px-8 h-12 rounded-xl"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar alterações
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
