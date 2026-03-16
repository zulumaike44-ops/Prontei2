/**
 * ServiceSelector — Seleção de serviço com preço e duração
 * Mobile-first, cards com destaque visual, animações staggered e tap feedback.
 */

import { Clock, Check, Sparkles } from "lucide-react";

interface ServiceItem {
  id: number;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  category: string | null;
}

interface ServiceSelectorProps {
  services: ServiceItem[];
  selectedServiceId: number | null;
  onSelect: (serviceId: number) => void;
  primaryColor: string;
}

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (isNaN(num) || num === 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

export function ServiceSelector({
  services,
  selectedServiceId,
  onSelect,
  primaryColor,
}: ServiceSelectorProps) {
  // Group by category
  const grouped: Record<string, ServiceItem[]> = {};
  for (const svc of services) {
    const cat = svc.category || "Serviços";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(svc);
  }

  const categories = Object.keys(grouped);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4" style={{ color: primaryColor }} />
        <span className="text-base font-semibold text-foreground">Escolha o serviço</span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {services.length} disponíveis
        </span>
      </div>

      {categories.map((cat) => (
        <div key={cat}>
          {categories.length > 1 && (
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <span className="w-4 h-px bg-border" />
              {cat}
              <span className="flex-1 h-px bg-border" />
            </p>
          )}
          <div className="space-y-2.5">
            {grouped[cat].map((svc, index) => {
              const isSelected = svc.id === selectedServiceId;
              return (
                <button
                  key={svc.id}
                  onClick={() => onSelect(svc.id)}
                  className={`w-full text-left rounded-xl p-4 border-2 transition-all duration-200 tap-feedback card-lift animate-fade-in-up ${
                    isSelected
                      ? "shadow-md"
                      : "border-border hover:border-muted-foreground/30 bg-card"
                  }`}
                  style={{
                    animationDelay: `${index * 0.06}s`,
                    ...(isSelected
                      ? {
                          borderColor: primaryColor,
                          backgroundColor: `${primaryColor}08`,
                          boxShadow: `0 4px 14px -3px ${primaryColor}25`,
                        }
                      : {}),
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-[15px]">{svc.name}</span>
                        {isSelected && (
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 animate-bounce-in"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Check className="w-3 h-3 text-white" />
                          </span>
                        )}
                      </div>
                      {svc.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {svc.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-medium">{svc.durationMinutes} min</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 pt-0.5">
                      <span
                        className="text-base font-bold"
                        style={{ color: primaryColor }}
                      >
                        {formatPrice(svc.price)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
