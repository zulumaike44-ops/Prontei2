/**
 * PUBLIC AVAILABILITY SERVICE — Disponibilidade e QuickSlots
 *
 * Reutiliza o motor de disponibilidade existente (availability.ts).
 * Adiciona:
 * - summary com availableCount e status (good/limited/full)
 * - QuickSlots: melhores horários de hoje e amanhã
 */

import { calculateAvailableSlots, type AvailableSlot } from "./availability";
import {
  getEstablishmentBySlug,
  getProfessionalById,
  getServiceById,
  getProfessionalServiceLinks,
  getProfessionalsByEstablishment,
} from "./db";

// ============================================================
// TYPES
// ============================================================

export interface AvailabilitySummary {
  availableCount: number;
  status: "good" | "limited" | "full";
}

export interface DayAvailabilityResult {
  date: string;
  slots: { time: string; available: boolean }[];
  summary: AvailabilitySummary;
  durationMinutes: number;
  effectivePrice: string;
}

export interface QuickSlot {
  date: string;
  dateLabel: string; // "Hoje" ou "Amanhã"
  time: string;
  professionalId: number;
  professionalName: string;
}

export interface QuickSlotsResult {
  today: QuickSlot[];
  tomorrow: QuickSlot[];
}

// ============================================================
// HELPERS
// ============================================================

function computeSummary(slotsCount: number): AvailabilitySummary {
  if (slotsCount === 0) return { availableCount: 0, status: "full" };
  if (slotsCount <= 3) return { availableCount: slotsCount, status: "limited" };
  return { availableCount: slotsCount, status: "good" };
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function getDateString(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ============================================================
// SERVICE
// ============================================================

export async function getDayAvailability(params: {
  slug: string;
  professionalId: number;
  serviceId: number;
  date: string;
}): Promise<DayAvailabilityResult | null> {
  const { slug, professionalId, serviceId, date } = params;

  const establishment = await getEstablishmentBySlug(slug);
  if (!establishment) return null;

  const professional = await getProfessionalById(professionalId, establishment.id);
  if (!professional) return null;

  const service = await getServiceById(serviceId, establishment.id);
  if (!service) return null;

  const result = await calculateAvailableSlots({
    professionalId,
    serviceId,
    date,
    establishmentId: establishment.id,
  });

  const availableSlots = result.slots;
  const summary = computeSummary(availableSlots.length);

  // Convert to the expected format with available flag
  const slotsWithFlag = availableSlots.map((s) => ({
    time: s.start,
    available: true,
  }));

  return {
    date,
    slots: slotsWithFlag,
    summary,
    durationMinutes: result.durationMinutes,
    effectivePrice: result.effectivePrice,
  };
}

/**
 * QuickSlots: retorna os melhores horários de hoje e amanhã
 * para um serviço específico, considerando todos os profissionais que o oferecem.
 * Limita a 5 slots por dia.
 */
export async function getQuickSlots(params: {
  slug: string;
  serviceId: number;
  professionalId?: number; // opcional — se informado, filtra por profissional
}): Promise<QuickSlotsResult | null> {
  const { slug, serviceId, professionalId } = params;

  const establishment = await getEstablishmentBySlug(slug);
  if (!establishment) return null;

  const todayStr = getDateString(0);
  const tomorrowStr = getDateString(1);

  // Get professionals that offer this service
  let targetProfessionals: { id: number; name: string }[] = [];

  if (professionalId) {
    const prof = await getProfessionalById(professionalId, establishment.id);
    if (prof) targetProfessionals = [{ id: prof.id, name: prof.name }];
  } else {
    const allProfs = await getProfessionalsByEstablishment(establishment.id);
    const activeProfs = allProfs.filter((p) => p.isActive && !p.deletedAt);

    for (const prof of activeProfs) {
      const links = await getProfessionalServiceLinks(prof.id, establishment.id);
      const hasService = links.some((l) => l.serviceId === serviceId && l.isActive);
      if (hasService) {
        targetProfessionals.push({ id: prof.id, name: prof.name });
      }
    }
  }

  const MAX_SLOTS_PER_DAY = 5;

  async function getSlotsForDay(date: string, label: string): Promise<QuickSlot[]> {
    const allSlots: QuickSlot[] = [];

    for (const prof of targetProfessionals) {
      const result = await calculateAvailableSlots({
        professionalId: prof.id,
        serviceId,
        date,
        establishmentId: establishment!.id,
      });

      for (const slot of result.slots) {
        allSlots.push({
          date,
          dateLabel: label,
          time: slot.start,
          professionalId: prof.id,
          professionalName: prof.name,
        });
      }
    }

    // Sort by time, then take first N
    allSlots.sort((a, b) => a.time.localeCompare(b.time));
    return allSlots.slice(0, MAX_SLOTS_PER_DAY);
  }

  const today = await getSlotsForDay(todayStr, "Hoje");
  const tomorrow = await getSlotsForDay(tomorrowStr, "Amanhã");

  return { today, tomorrow };
}
