/**
 * PUBLIC BOOKING SERVICE — Dados da página de agendamento público
 */

import {
  getEstablishmentBySlug,
  getProfessionalsByEstablishment,
  getServicesByEstablishment,
  getProfessionalServiceLinks,
} from "./db";

// ============================================================
// TYPES
// ============================================================

export interface BookingPageData {
  establishment: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    phone: string | null;
    address: string | null;
    primaryColor: string;
    secondaryColor: string;
  };
  services: {
    id: number;
    name: string;
    description: string | null;
    durationMinutes: number;
    price: string;
    category: string | null;
  }[];
  professionals: {
    id: number;
    name: string;
    photoUrl: string | null;
    bio: string | null;
    serviceIds: number[];
  }[];
}

// ============================================================
// SERVICE
// ============================================================

function buildAddress(est: any): string | null {
  const parts = [
    est.addressStreet,
    est.addressNumber ? `, ${est.addressNumber}` : "",
    est.addressNeighborhood ? ` - ${est.addressNeighborhood}` : "",
    est.addressCity ? `, ${est.addressCity}` : "",
    est.addressState ? `/${est.addressState}` : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join("") : null;
}

export async function getBookingPageData(slug: string): Promise<BookingPageData | null> {
  const establishment = await getEstablishmentBySlug(slug);
  if (!establishment) return null;

  // Get active professionals
  const allProfessionals = await getProfessionalsByEstablishment(establishment.id);
  const activeProfessionals = allProfessionals.filter((p) => p.isActive && !p.deletedAt);

  // Get active services
  const allServices = await getServicesByEstablishment(establishment.id);
  const activeServices = allServices.filter((s) => s.isActive && !s.deletedAt);

  // Get professional-service links for each professional
  const professionalServiceMap: Record<number, number[]> = {};
  for (const prof of activeProfessionals) {
    const links = await getProfessionalServiceLinks(prof.id, establishment.id);
    professionalServiceMap[prof.id] = links
      .filter((l) => l.isActive)
      .map((l) => l.serviceId);
  }

  return {
    establishment: {
      id: establishment.id,
      name: establishment.name,
      slug: establishment.slug,
      description: establishment.description,
      logoUrl: establishment.logoUrl,
      phone: establishment.phone,
      address: buildAddress(establishment),
      primaryColor: (establishment as any).primaryColor ?? "#0F172A",
      secondaryColor: (establishment as any).secondaryColor ?? "#F8FAFC",
    },
    services: activeServices.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      price: s.price,
      category: s.category,
    })),
    professionals: activeProfessionals.map((p) => ({
      id: p.id,
      name: p.name,
      photoUrl: p.avatarUrl,
      bio: p.bio,
      serviceIds: professionalServiceMap[p.id] ?? [],
    })),
  };
}
