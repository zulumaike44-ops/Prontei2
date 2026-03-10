import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import WorkingHoursEditor from "@/components/WorkingHoursEditor";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function WorkingHoursPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, params] = useRoute("/working-hours/:id");
  const [, navigate] = useLocation();
  const professionalId = params?.id ? parseInt(params.id, 10) : 0;

  const { data: professional, isLoading: profLoading } =
    trpc.professional.get.useQuery(
      { id: professionalId },
      { enabled: !!user && professionalId > 0 }
    );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/professionals")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">
              Horários de Atendimento
            </h1>
            {professional && (
              <p className="text-muted-foreground text-sm">
                Configurar grade semanal de{" "}
                <span className="font-medium text-foreground">
                  {professional.name}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        {profLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !professional ? (
          <div className="text-center py-12 text-muted-foreground">
            Profissional não encontrado.
          </div>
        ) : (
          <WorkingHoursEditor
            professionalId={professional.id}
            professionalName={professional.name}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
