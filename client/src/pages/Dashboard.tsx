import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect } from "react";
import {
  Calendar,
  Users,
  Scissors,
  Clock,
  Building2,
  TrendingUp,
  CalendarPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const {
    data: establishment,
    isLoading: estLoading,
  } = trpc.establishment.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Redirect to onboarding if no establishment or onboarding not completed
  useEffect(() => {
    if (!authLoading && !estLoading) {
      if (establishment && !establishment.onboardingCompleted) {
        setLocation("/onboarding");
      }
    }
  }, [authLoading, estLoading, establishment, setLocation]);

  if (authLoading || estLoading) {
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
        <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="font-heading text-2xl font-semibold text-foreground mb-2">
              Bem-vindo ao Agiliza no Zap!
            </h2>
            <p className="text-muted-foreground max-w-md">
              Vamos configurar seu estabelecimento para você começar a receber
              agendamentos.
            </p>
          </div>
          <Button
            onClick={() => setLocation("/onboarding")}
            className="bg-primary hover:bg-terracotta-dark text-primary-foreground"
            size="lg"
          >
            Configurar meu negócio
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Painel
            </h1>
            <p className="text-muted-foreground">
              Olá, {user?.name?.split(" ")[0]}! Aqui está o resumo do{" "}
              <strong>{establishment.name}</strong>.
            </p>
          </div>
          <Button
            className="bg-primary hover:bg-terracotta-dark text-primary-foreground"
            onClick={() => {
              // Future: open new appointment modal
              import("sonner").then(({ toast }) =>
                toast.info("Funcionalidade em breve", {
                  description:
                    "O módulo de agendamentos será implementado na próxima etapa.",
                })
              );
            }}
          >
            <CalendarPlus className="w-4 h-4 mr-2" />
            Novo agendamento
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Agendamentos hoje",
              value: "0",
              icon: Calendar,
              color: "text-primary",
              bgColor: "bg-primary/10",
            },
            {
              label: "Profissionais",
              value: "0",
              icon: Users,
              color: "text-teal",
              bgColor: "bg-teal/10",
            },
            {
              label: "Serviços",
              value: "0",
              icon: Scissors,
              color: "text-amber",
              bgColor: "bg-amber/10",
            },
            {
              label: "Este mês",
              value: "0",
              icon: TrendingUp,
              color: "text-primary",
              bgColor: "bg-primary/10",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card rounded-xl border border-border/50 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-medium">
                  {stat.label}
                </span>
                <div
                  className={`w-9 h-9 rounded-lg ${stat.bgColor} flex items-center justify-center`}
                >
                  <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                </div>
              </div>
              <p className="font-heading text-3xl font-bold text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Quick Actions / Empty State */}
        <div className="bg-card rounded-xl border border-border/50 p-8 shadow-sm">
          <div className="text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-cream-dark flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
              Sua agenda está vazia
            </h3>
            <p className="text-muted-foreground mb-6">
              Cadastre profissionais e serviços para começar a receber
              agendamentos. Os módulos completos serão ativados em breve.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => setLocation("/settings")}
                className="border-border"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Configurações
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
