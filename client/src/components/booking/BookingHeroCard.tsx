/**
 * BookingHeroCard — Header visual da página de agendamento público
 *
 * Exibe logo, nome, descrição, endereço e telefone do estabelecimento.
 * Usa as cores primária/secundária do tenant.
 */

import { MapPin, Phone } from "lucide-react";

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
      className="rounded-2xl overflow-hidden shadow-lg"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="px-5 py-6 flex items-center gap-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name}
            className="w-16 h-16 rounded-xl object-cover border-2 border-white/20 flex-shrink-0"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
            style={{ backgroundColor: secondaryColor, color: primaryColor }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h1
            className="text-xl font-bold truncate"
            style={{ color: secondaryColor }}
          >
            {name}
          </h1>
          {description && (
            <p
              className="text-sm mt-0.5 line-clamp-2 opacity-80"
              style={{ color: secondaryColor }}
            >
              {description}
            </p>
          )}
        </div>
      </div>

      {(address || phone) && (
        <div
          className="px-5 py-3 flex flex-wrap gap-x-4 gap-y-1 text-xs border-t border-white/10"
          style={{ color: secondaryColor, opacity: 0.7 }}
        >
          {address && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {address}
            </span>
          )}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-1 hover:opacity-100 transition-opacity"
            >
              <Phone className="w-3 h-3" />
              {phone}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
