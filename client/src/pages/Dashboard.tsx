import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import {
  Calendar,
  Users,
  Scissors,
  Clock,
  Building2,
  TrendingUp,
  CalendarPlus,
  UserRound,
  ArrowRight,
  Link2,
  Copy,
  Check,
  QrCode,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const {
    data: establishment,
    isLoading: estLoading,
  } = trpc.establishment.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const {
    data: summary,
    isLoading: summaryLoading,
  } = trpc.dashboard.summary.useQuery(undefined, {
    enabled: isAuthenticated && !!establishment,
    refetchInterval: 60_000, // Refresh every 60s
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
              Bem-vindo ao Prontei!
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

  // Stats cards configuration
  const statsCards = [
    {
      label: "Agendamentos hoje",
      value: summary?.appointmentsToday ?? 0,
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
      href: "/dashboard/agenda",
      linkLabel: "Ver agenda",
    },
    {
      label: "Profissionais",
      value: summary?.activeProfessionals ?? 0,
      icon: Users,
      color: "text-teal",
      bgColor: "bg-teal/10",
      href: "/professionals",
      linkLabel: "Gerenciar",
    },
    {
      label: "Serviços",
      value: summary?.activeServices ?? 0,
      icon: Scissors,
      color: "text-amber",
      bgColor: "bg-amber/10",
      href: "/services",
      linkLabel: "Gerenciar",
    },
    {
      label: "Este mês",
      value: summary?.appointmentsThisMonth ?? 0,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
      href: "/appointments",
      linkLabel: "Ver todos",
    },
  ];

  // Check if the tenant has any data at all
  const hasData =
    summary &&
    (summary.activeProfessionals > 0 ||
      summary.activeServices > 0 ||
      summary.activeCustomers > 0 ||
      summary.appointmentsToday > 0 ||
      summary.appointmentsThisMonth > 0);

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
            onClick={() => setLocation("/appointments")}
          >
            <CalendarPlus className="w-4 h-4 mr-2" />
            Novo agendamento
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat) => (
            <div
              key={stat.label}
              className="bg-card rounded-xl border border-border/50 p-5 shadow-sm group hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setLocation(stat.href)}
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

              {summaryLoading ? (
                <Skeleton className="h-9 w-16 rounded" />
              ) : (
                <p className="font-heading text-3xl font-bold text-foreground">
                  {stat.value}
                </p>
              )}

              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <span>{stat.linkLabel}</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>

        {/* Booking Link Card */}
        {establishment?.slug && (
          <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl border border-primary/20 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    Link de agendamento
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Compartilhe com seus clientes para agendarem online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex-1 sm:flex-none bg-background/80 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground font-mono truncate max-w-xs">
                  {window.location.origin}/agendar/{establishment.slug}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 border-primary/30 hover:bg-primary/10"
                  onClick={() => {
                    const url = `${window.location.origin}/agendar/${establishment.slug}`;
                    navigator.clipboard.writeText(url);
                    setCopied(true);
                    toast.success("Link copiado!");
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-primary" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 border-primary/30 hover:bg-primary/10"
                  onClick={() => setShowQr(!showQr)}
                >
                  <QrCode className="w-4 h-4 text-primary" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 border-primary/30 hover:bg-primary/10"
                  onClick={() => {
                    window.open(`/agendar/${establishment.slug}`, "_blank");
                  }}
                >
                  <ExternalLink className="w-4 h-4 text-primary" />
                </Button>
              </div>
            </div>
            {showQr && (
              <div className="mt-4 flex flex-col items-center gap-3 p-4 bg-white rounded-xl border border-border/30">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/agendar/${establishment.slug}`)}`}
                  alt="QR Code do link de agendamento"
                  className="w-48 h-48 rounded-lg"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Escaneie o QR Code para abrir a página de agendamento
                </p>
              </div>
            )}
          </div>
        )}

        {/* Optional: Customers card */}
        {summary && summary.activeCustomers > 0 && (
          <div
            className="bg-card rounded-xl border border-border/50 p-5 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setLocation("/customers")}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                <UserRound className="w-4.5 h-4.5 text-violet-600" />
              </div>
              <div>
                <span className="text-sm text-muted-foreground font-medium">
                  Clientes ativos
                </span>
                {summaryLoading ? (
                  <Skeleton className="h-7 w-12 rounded mt-0.5" />
                ) : (
                  <p className="font-heading text-xl font-bold text-foreground">
                    {summary.activeCustomers}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Gerenciar</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        )}

        {/* Quick Actions / Empty State */}
        {!summaryLoading && !hasData && (
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
                agendamentos.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/professionals")}
                  className="border-border"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Cadastrar profissional
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation("/services")}
                  className="border-border"
                >
                  <Scissors className="w-4 h-4 mr-2" />
                  Cadastrar serviço
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Active state: quick summary */}
        {!summaryLoading && hasData && (
          <div className="bg-card rounded-xl border border-border/50 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-heading text-base font-semibold text-foreground mb-1">
                  Acesso rápido
                </h3>
                <p className="text-sm text-muted-foreground">
                  Gerencie sua agenda e cadastros
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/dashboard/agenda")}
                  className="border-border"
                >
                  <Calendar className="w-4 h-4 mr-1.5" />
                  Agenda do dia
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/appointments")}
                  className="border-border"
                >
                  <CalendarPlus className="w-4 h-4 mr-1.5" />
                  Novo agendamento
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/customers")}
                  className="border-border"
                >
                  <UserRound className="w-4 h-4 mr-1.5" />
                  Clientes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
