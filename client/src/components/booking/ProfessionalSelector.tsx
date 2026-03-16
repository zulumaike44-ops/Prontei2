/**
 * ProfessionalSelector — Seleção de profissional
 * Inclui opção "Qualquer profissional" (seleciona o primeiro disponível).
 * Mobile-first, cards horizontais com animações e tap feedback.
 */

import { Check, Shuffle, User, Users } from "lucide-react";

interface ProfessionalItem {
  id: number;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  serviceIds: number[];
}

interface ProfessionalSelectorProps {
  professionals: ProfessionalItem[];
  selectedProfessionalId: number | null;
  onSelect: (professionalId: number | null) => void;
  serviceId: number | null;
  primaryColor: string;
  showAnyOption?: boolean;
}

export function ProfessionalSelector({
  professionals,
  selectedProfessionalId,
  onSelect,
  serviceId,
  primaryColor,
  showAnyOption = true,
}: ProfessionalSelectorProps) {
  // Filter professionals that offer the selected service
  const filtered = serviceId
    ? professionals.filter((p) => p.serviceIds.includes(serviceId))
    : professionals;

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm animate-fade-in-up">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Nenhum profissional disponível</p>
        <p className="text-xs mt-1">Tente selecionar outro serviço.</p>
      </div>
    );
  }

  const isAnySelected = selectedProfessionalId === null;

  return (
    <div className="space-y-3 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4" style={{ color: primaryColor }} />
        <span className="text-base font-semibold text-foreground">Escolha o profissional</span>
      </div>

      {/* Opção "Qualquer profissional" */}
      {showAnyOption && filtered.length > 1 && (
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left rounded-xl p-4 border-2 transition-all duration-200 tap-feedback card-lift ${
            isAnySelected
              ? "shadow-md"
              : "border-border hover:border-muted-foreground/30 bg-card"
          }`}
          style={
            isAnySelected
              ? {
                  borderColor: primaryColor,
                  backgroundColor: `${primaryColor}08`,
                  boxShadow: `0 4px 14px -3px ${primaryColor}25`,
                }
              : undefined
          }
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
              style={{
                backgroundColor: isAnySelected ? primaryColor : "var(--muted)",
                color: isAnySelected ? "#fff" : "var(--muted-foreground)",
              }}
            >
              <Shuffle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-foreground">Qualquer profissional</span>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Escolhemos o primeiro horário disponível para você
              </p>
            </div>
            {isAnySelected && (
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 animate-bounce-in"
                style={{ backgroundColor: primaryColor }}
              >
                <Check className="w-3 h-3 text-white" />
              </span>
            )}
          </div>
        </button>
      )}

      {/* Lista de profissionais */}
      <div className="space-y-2.5">
        {filtered.map((prof, index) => {
          const isSelected = prof.id === selectedProfessionalId;
          return (
            <button
              key={prof.id}
              onClick={() => onSelect(prof.id)}
              className={`w-full text-left rounded-xl p-4 border-2 transition-all duration-200 tap-feedback card-lift animate-fade-in-up ${
                isSelected
                  ? "shadow-md"
                  : "border-border hover:border-muted-foreground/30 bg-card"
              }`}
              style={{
                animationDelay: `${(index + 1) * 0.06}s`,
                ...(isSelected
                  ? {
                      borderColor: primaryColor,
                      backgroundColor: `${primaryColor}08`,
                      boxShadow: `0 4px 14px -3px ${primaryColor}25`,
                    }
                  : {}),
              }}
            >
              <div className="flex items-center gap-3">
                {prof.photoUrl ? (
                  <img
                    src={prof.photoUrl}
                    alt={prof.name}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 transition-all"
                    style={{
                      borderColor: isSelected ? primaryColor : "transparent",
                    }}
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      backgroundColor: isSelected ? `${primaryColor}15` : "var(--muted)",
                      color: isSelected ? primaryColor : "var(--muted-foreground)",
                    }}
                  >
                    <User className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-foreground">{prof.name}</span>
                  {prof.bio && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 leading-relaxed">
                      {prof.bio}
                    </p>
                  )}
                </div>
                {isSelected && (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 animate-bounce-in"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
