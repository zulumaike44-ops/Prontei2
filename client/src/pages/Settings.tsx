import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { Loader2, Save, Building2, Link2, Copy, Check, QrCode, ExternalLink, Pencil } from "lucide-react";
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
  const [slug, setSlug] = useState("");
  const [editingSlug, setEditingSlug] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
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
      setSlug(establishment.slug || "");
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

        {/* Booking Link Section */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-semibold">
                  Link de agendamento
                </h2>
                <p className="text-sm text-muted-foreground">
                  Compartilhe este link para seus clientes agendarem online.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Current Link */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Seu link</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted/50 border border-border/50 rounded-xl px-4 py-3 text-sm font-mono text-foreground truncate">
                  {window.location.origin}/agendar/{slug || establishment?.slug}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-11 w-11 rounded-xl"
                  onClick={() => {
                    const url = `${window.location.origin}/agendar/${slug || establishment?.slug}`;
                    navigator.clipboard.writeText(url);
                    setCopied(true);
                    toast.success("Link copiado!");
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-11 w-11 rounded-xl"
                  onClick={() => setShowQr(!showQr)}
                >
                  <QrCode className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-11 w-11 rounded-xl"
                  onClick={() => window.open(`/agendar/${slug || establishment?.slug}`, "_blank")}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* QR Code */}
            {showQr && (
              <div className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border border-border/30">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/agendar/${slug || establishment?.slug}`)}`}
                  alt="QR Code"
                  className="w-48 h-48 rounded-lg"
                />
                <p className="text-xs text-muted-foreground">Escaneie para abrir a página de agendamento</p>
              </div>
            )}

            {/* Customize Slug */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Personalizar link</Label>
              {editingSlug ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">.../agendar/</span>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/--+/g, "-"))}
                    className="h-11 rounded-xl font-mono"
                    placeholder="meu-salao"
                  />
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-terracotta-dark text-primary-foreground rounded-xl h-11 px-4"
                    disabled={updateMutation.isPending || !slug.trim() || slug.length < 3}
                    onClick={() => {
                      updateMutation.mutate({ slug: slug.trim() }, {
                        onSuccess: () => {
                          setEditingSlug(false);
                          toast.success("Link atualizado!");
                        },
                      });
                    }}
                  >
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-11"
                    onClick={() => {
                      setSlug(establishment?.slug || "");
                      setEditingSlug(false);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setEditingSlug(true)}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Personalizar
                </Button>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Use letras minúsculas, números e hífens. Mínimo 3 caracteres.
              </p>
            </div>
          </div>
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
