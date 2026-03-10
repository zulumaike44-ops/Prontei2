import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  Calendar,
  Clock,
  Users,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  Star,
} from "lucide-react";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // If authenticated, redirect to dashboard or onboarding
  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [loading, isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading text-lg font-semibold text-foreground">
              Prontei
            </span>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            className="bg-primary hover:bg-terracotta-dark text-primary-foreground"
          >
            Entrar
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
            <Star className="w-3.5 h-3.5 text-amber" />
            Feito para quem vive de agenda
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
            Sua agenda profissional,{" "}
            <span className="text-primary">simples como deveria ser</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Organize seus agendamentos, gerencie seus profissionais e nunca mais
            perca um cliente por falta de organização. Tudo em um só lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
              className="bg-primary hover:bg-terracotta-dark text-primary-foreground text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Começar gratuitamente
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Sem cartão de crédito. Comece em menos de 2 minutos.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-cream-dark/50">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Tudo que você precisa para gerenciar sua agenda
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Funcionalidades pensadas para o dia a dia de quem trabalha com
              agendamento.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Calendar,
                title: "Agenda inteligente",
                description:
                  "Visualize todos os agendamentos do dia, semana ou mês. Sem conflitos, sem confusão.",
              },
              {
                icon: Users,
                title: "Gestão de profissionais",
                description:
                  "Cadastre sua equipe, defina horários individuais e vincule serviços a cada profissional.",
              },
              {
                icon: Clock,
                title: "Horários flexíveis",
                description:
                  "Configure horários de funcionamento, intervalos e bloqueios para cada dia da semana.",
              },
              {
                icon: Smartphone,
                title: "Mobile-first",
                description:
                  "Funciona perfeitamente no celular. Gerencie sua agenda de qualquer lugar.",
              },
              {
                icon: CheckCircle2,
                title: "Onboarding guiado",
                description:
                  "Configure seu estabelecimento em poucos passos. Sem complicação, sem manual.",
              },
              {
                icon: Star,
                title: "Multi-nicho",
                description:
                  "Salão de beleza, barbearia, clínica, estúdio de tatuagem — funciona para qualquer negócio de agenda.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Pronto para organizar sua agenda?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Crie sua conta em segundos e comece a usar agora mesmo.
          </p>
          <Button
            size="lg"
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            className="bg-primary hover:bg-terracotta-dark text-primary-foreground text-lg px-8 py-6 rounded-xl shadow-lg"
          >
            Criar minha conta grátis
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/50">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">
            Prontei &copy; {new Date().getFullYear()} — Agendamento inteligente
            para negócios.
          </p>
        </div>
      </footer>
    </div>
  );
}
