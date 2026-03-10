import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import {
  Building2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Calendar,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { id: 1, title: "Seu negócio", icon: Building2 },
  { id: 2, title: "Endereço", icon: MapPin },
  { id: 3, title: "Concluído", icon: CheckCircle2 },
];

export default function Onboarding() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const {
    data: establishment,
    isLoading: estLoading,
    refetch,
  } = trpc.establishment.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: businessTypesList } = trpc.businessTypes.list.useQuery();

  const createMutation = trpc.establishment.create.useMutation({
    onSuccess: () => {
      refetch();
      setCurrentStep(2);
    },
    onError: (err) => {
      toast.error("Erro ao criar estabelecimento", {
        description: err.message,
      });
    },
  });

  const updateMutation = trpc.establishment.update.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (err) => {
      toast.error("Erro ao atualizar", { description: err.message });
    },
  });

  const advanceMutation = trpc.establishment.advanceOnboarding.useMutation({
    onSuccess: (data) => {
      refetch();
      if (data?.onboardingCompleted) {
        toast.success("Configuração concluída!", {
          description: "Seu estabelecimento está pronto para uso.",
        });
        setLocation("/dashboard");
      }
    },
    onError: (err) => {
      toast.error("Erro", { description: err.message });
    },
  });

  // Form state — Step 1
  const [name, setName] = useState("");
  const [businessTypeId, setBusinessTypeId] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Form state — Step 2
  const [addressZipcode, setAddressZipcode] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");

  // Current step
  const [currentStep, setCurrentStep] = useState(1);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [authLoading, isAuthenticated]);

  // If establishment exists and onboarding is complete, go to dashboard
  useEffect(() => {
    if (!estLoading && establishment) {
      if (establishment.onboardingCompleted) {
        setLocation("/dashboard");
        return;
      }
      // Resume from where they left off
      setCurrentStep(establishment.onboardingStep);
      // Pre-fill form
      setName(establishment.name || "");
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
  }, [estLoading, establishment, setLocation]);

  if (authLoading || estLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleStep1Submit = () => {
    if (!name.trim()) {
      toast.error("Informe o nome do seu negócio.");
      return;
    }
    if (!businessTypeId) {
      toast.error("Selecione o tipo do seu negócio.");
      return;
    }

    if (!establishment) {
      // Create new establishment
      createMutation.mutate({
        name: name.trim(),
        businessTypeId,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
    } else {
      // Update existing and advance
      updateMutation.mutate(
        { name: name.trim(), phone: phone.trim() || undefined, email: email.trim() || undefined },
        {
          onSuccess: () => {
            setCurrentStep(2);
          },
        }
      );
    }
  };

  const handleStep2Submit = () => {
    if (establishment) {
      updateMutation.mutate(
        {
          addressZipcode: addressZipcode.trim() || undefined,
          addressStreet: addressStreet.trim() || undefined,
          addressNumber: addressNumber.trim() || undefined,
          addressComplement: addressComplement.trim() || undefined,
          addressNeighborhood: addressNeighborhood.trim() || undefined,
          addressCity: addressCity.trim() || undefined,
          addressState: addressState.trim() || undefined,
        },
        {
          onSuccess: () => {
            // Mark onboarding as complete (step 7 = completed)
            advanceMutation.mutate({ step: 7 });
          },
        }
      );
    }
  };

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    advanceMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container flex items-center h-16 gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-heading text-lg font-semibold">
            Prontei
          </span>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto py-12 px-4">
        {/* Progress bar */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  currentStep >= step.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  step.id
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-16 sm:w-24 h-1 rounded-full transition-colors ${
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Business info */}
        {currentStep === 1 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                Sobre o seu negócio
              </h1>
              <p className="text-muted-foreground text-lg">
                Vamos começar com as informações básicas do seu estabelecimento.
              </p>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nome do negócio *
                </Label>
                <Input
                  id="name"
                  placeholder="Ex: Salão da Maria, Barbearia do João..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Tipo do negócio *
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(businessTypesList ?? []).map((bt) => (
                    <button
                      key={bt.id}
                      type="button"
                      onClick={() => setBusinessTypeId(bt.id)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        businessTypeId === bt.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border/50 hover:border-primary/30 text-foreground"
                      }`}
                    >
                      <span className="text-2xl block mb-1">
                        {bt.icon || "🏪"}
                      </span>
                      <span className="text-sm font-medium">{bt.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Telefone / WhatsApp
                  </Label>
                  <Input
                    id="phone"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contato@meunegocio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleStep1Submit}
                disabled={isSubmitting}
                className="bg-primary hover:bg-terracotta-dark text-primary-foreground px-8 h-12 rounded-xl"
                size="lg"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Address */}
        {currentStep === 2 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                Endereço do estabelecimento
              </h1>
              <p className="text-muted-foreground text-lg">
                Opcional, mas ajuda seus clientes a encontrarem você.
              </p>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep" className="text-sm font-medium">
                    CEP
                  </Label>
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={addressZipcode}
                    onChange={(e) => setAddressZipcode(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm font-medium">
                    Estado
                  </Label>
                  <Input
                    id="state"
                    placeholder="SP"
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
                <Label htmlFor="city" className="text-sm font-medium">
                  Cidade
                </Label>
                <Input
                  id="city"
                  placeholder="São Paulo"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood" className="text-sm font-medium">
                  Bairro
                </Label>
                <Input
                  id="neighborhood"
                  placeholder="Centro"
                  value={addressNeighborhood}
                  onChange={(e) => setAddressNeighborhood(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="street" className="text-sm font-medium">
                    Rua
                  </Label>
                  <Input
                    id="street"
                    placeholder="Rua das Flores"
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number" className="text-sm font-medium">
                    Número
                  </Label>
                  <Input
                    id="number"
                    placeholder="123"
                    value={addressNumber}
                    onChange={(e) => setAddressNumber(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complement" className="text-sm font-medium">
                  Complemento
                </Label>
                <Input
                  id="complement"
                  placeholder="Sala 2, Bloco A..."
                  value={addressComplement}
                  onChange={(e) => setAddressComplement(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="h-12 rounded-xl px-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={handleStep2Submit}
                disabled={isSubmitting}
                className="bg-primary hover:bg-terracotta-dark text-primary-foreground px-8 h-12 rounded-xl"
                size="lg"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Concluir configuração
                <CheckCircle2 className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Completed (brief transition) */}
        {currentStep >= 3 && (
          <div className="text-center space-y-6 py-12">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground">
              Tudo pronto!
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Seu estabelecimento foi configurado com sucesso. Vamos para o
              painel!
            </p>
            <Button
              onClick={() => setLocation("/dashboard")}
              className="bg-primary hover:bg-terracotta-dark text-primary-foreground px-8 h-12 rounded-xl"
              size="lg"
            >
              Ir para o Painel
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
