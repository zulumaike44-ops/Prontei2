/**
 * ProfessionalSelector — Seleção de profissional
 * Inclui opção "Qualquer profissional" (seleciona o primeiro disponível).
 * Mobile-first, cards horizontais.
 */

import { Check, Shuffle, User } from "lucide-react";

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
      <div className="text-center py-6 text-muted-foreground text-sm">
        Nenhum profissional disponível para este serviço.
      </div>
    );
  }

  const isAnySelected = selectedProfessionalId === null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base font-semibold text-foreground">Escolha o profissional</span>
      </div>

      {/* Opção "Qualquer profissional" */}
      {showAnyOption && filtered.length > 1 && (
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left rounded-xl p-4 border-2 transition-all duration-200 ${
            isAnySelected
              ? "shadow-md"
              : "border-border hover:border-muted-foreground/30 bg-card"
          }`}
          style={
            isAnySelected
              ? {
                  borderColor: primaryColor,
                  backgroundColor: `${primaryColor}08`,
                }
              : undefined
          }
        >
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: isAnySelected ? primaryColor : undefined,
                color: isAnySelected ? "#fff" : undefined,
              }}
            >
              <Shuffle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-medium text-foreground">Qualquer profissional</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Escolhemos o primeiro horário disponível
              </p>
            </div>
            {isAnySelected && (
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                <Check className="w-3 h-3 text-white" />
              </span>
            )}
          </div>
        </button>
      )}

      {/* Lista de profissionais */}
      <div className="space-y-2">
        {filtered.map((prof) => {
          const isSelected = prof.id === selectedProfessionalId;
          return (
            <button
              key={prof.id}
              onClick={() => onSelect(prof.id)}
              className={`w-full text-left rounded-xl p-4 border-2 transition-all duration-200 ${
                isSelected
                  ? "shadow-md"
                  : "border-border hover:border-muted-foreground/30 bg-card"
              }`}
              style={
                isSelected
                  ? {
                      borderColor: primaryColor,
                      backgroundColor: `${primaryColor}08`,
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-3">
                {prof.photoUrl ? (
                  <img
                    src={prof.photoUrl}
                    alt={prof.name}
                    className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">{prof.name}</span>
                  {prof.bio && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {prof.bio}
                    </p>
                  )}
                </div>
                {isSelected && (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
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
