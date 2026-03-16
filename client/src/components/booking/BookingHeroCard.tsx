/**
 * BookingHeroCard — Header visual da página de agendamento público
 *
 * Exibe logo, nome, descrição, endereço e telefone do estabelecimento.
 * Usa as cores primária/secundária do tenant.
 * Inclui animações de entrada e micro-interações.
 */

import { MapPin, Phone, Star } from "lucide-react";

interface BookingHeroCardProps {
  name: string;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  address: string | null;
  primaryColor: string;
  secondaryColor: string;
}

export function BookingHeroCard({
  name,
  description,
  logoUrl,
  phone,
  address,
  primaryColor,
  secondaryColor,
}: BookingHeroCardProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-lg animate-fade-in-up relative"
      style={{ backgroundColor: primaryColor }}
    >
      {/* Subtle gradient overlay for depth */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)`,
        }}
      />

      <div className="px-5 py-6 flex items-center gap-4 relative z-10">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name}
            className="w-18 h-18 rounded-xl object-cover border-2 border-white/25 flex-shrink-0 shadow-md animate-fade-in-scale"
            style={{ width: "4.5rem", height: "4.5rem" }}
          />
        ) : (
          <div
            className="rounded-xl flex items-center justify-center text-2xl font-bold flex-shrink-0 shadow-md animate-fade-in-scale"
            style={{
              width: "4.5rem",
              height: "4.5rem",
              backgroundColor: secondaryColor,
              color: primaryColor,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h1
            className="text-xl font-bold truncate tracking-tight"
            style={{ color: secondaryColor }}
          >
            {name}
          </h1>
          {description && (
            <p
              className="text-sm mt-1 line-clamp-2 opacity-85 leading-relaxed"
              style={{ color: secondaryColor }}
            >
              {description}
            </p>
          )}
          <div className="flex items-center gap-1 mt-2 opacity-70">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className="w-3 h-3"
                style={{ color: secondaryColor }}
                fill={secondaryColor}
              />
            ))}
            <span
              className="text-[10px] ml-1 font-medium"
              style={{ color: secondaryColor }}
            >
              Agendamento online
            </span>
          </div>
        </div>
      </div>

      {(address || phone) && (
        <div
          className="px-5 py-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs border-t border-white/15 relative z-10"
          style={{ color: secondaryColor, opacity: 0.8 }}
        >
          {address && (
            <span className="flex items-center gap-1.5 hover:opacity-100 transition-opacity">
              <MapPin className="w-3.5 h-3.5" />
              {address}
            </span>
          )}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-1.5 hover:opacity-100 transition-opacity tap-feedback"
            >
              <Phone className="w-3.5 h-3.5" />
              {phone}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
