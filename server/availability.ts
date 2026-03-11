/**
 * AVAILABILITY ENGINE — Motor de Disponibilidade (Etapa 15)
 *
 * Calcula slots disponíveis para um profissional+serviço em uma data.
 *
 * Fluxo:
 * 1. Buscar working_hours do profissional naquele dia da semana
 * 2. Validar se o dia está ativo
 * 3. Aplicar break (breakStart/breakEnd)
 * 4. Buscar blocked_times ativos que afetem o dia
 * 5. Buscar appointments com status pending/confirmed
 * 6. Descobrir duração efetiva do serviço (custom ou padrão)
 * 7. Gerar slots candidatos em grade fixa de 10 em 10 minutos
 * 8. Eliminar slots que conflitem
 * 9. Retornar lista final
 *
 * Decisões simplificadoras do MVP:
 * - Grade fixa de 10 minutos (não configurável)
 * - Não permite agendar no passado (slots antes de "agora" são removidos)
 * - Blocked_times com professionalId=null afetam TODOS os profissionais
 * - Status "pending" e "confirmed" são considerados como ocupando agenda
 */

import {
  getWorkingHoursByProfessional,
  getBlockedTimesByEstablishment,
  getProfessionalServiceLinks,
} from "./db";
import {
  getAppointmentsByProfessionalAndDateRange,
} from "./appointmentDb";

// ============================================================
// TYPES
// ============================================================

export interface AvailableSlot {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export interface TimeInterval {
  startMinutes: number; // minutes from midnight
  endMinutes: number;
}

// ============================================================
// HELPERS: Time conversion
// ============================================================

/** Convert "HH:mm" to minutes from midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Convert minutes from midnight to "HH:mm" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

// ============================================================
// HELPER: Overlap detection (centralizada)
// ============================================================

/**
 * Detecta se dois intervalos se sobrepõem.
 * Conflito existe quando: existing.start < newEnd AND existing.end > newStart
 */
export function hasOverlap(
  existingStart: number,
  existingEnd: number,
  newStart: number,
  newEnd: number
): boolean {
  return existingStart < newEnd && existingEnd > newStart;
}

/**
 * Detecta overlap entre dois intervalos de Date.
 * Conflito: existingStart < newEnd AND existingEnd > newStart
 */
export function hasDateOverlap(
  existingStart: Date,
  existingEnd: Date,
  newStart: Date,
  newEnd: Date
): boolean {
  return existingStart.getTime() < newEnd.getTime() &&
    existingEnd.getTime() > newStart.getTime();
}

// ============================================================
// CORE: Calculate available slots
// ============================================================

const SLOT_INTERVAL_MINUTES = 10;

export async function calculateAvailableSlots(params: {
  professionalId: number;
  serviceId: number;
  date: string; // "YYYY-MM-DD"
  establishmentId: number;
}): Promise<{
  slots: AvailableSlot[];
  durationMinutes: number;
  effectivePrice: string;
}> {
  const { professionalId, serviceId, date, establishmentId } = params;

  // 1. Get working hours for the professional
  const allWorkingHours = await getWorkingHoursByProfessional(
    professionalId,
    establishmentId
  );

  // 2. Find the working hours for the target day of week
  const targetDate = new Date(date + "T12:00:00"); // noon to avoid timezone issues
  const dayOfWeek = targetDate.getDay(); // 0=Sun, 6=Sat

  const daySchedule = allWorkingHours.find(
    (wh) => wh.dayOfWeek === dayOfWeek && wh.isActive
  );

  if (!daySchedule) {
    // Professional doesn't work on this day
    return { slots: [], durationMinutes: 0, effectivePrice: "0" };
  }

  // 3. Get effective duration and price from professional_services link
  const links = await getProfessionalServiceLinks(professionalId, establishmentId);
  const link = links.find((l) => l.serviceId === serviceId && l.isActive);

  if (!link) {
    // Professional doesn't offer this service
    return { slots: [], durationMinutes: 0, effectivePrice: "0" };
  }

  const durationMinutes = link.customDurationMinutes ?? link.serviceDurationMinutes;
  const effectivePrice = link.customPrice ?? link.servicePrice;

  if (!durationMinutes || durationMinutes <= 0) {
    return { slots: [], durationMinutes: 0, effectivePrice: effectivePrice ?? "0" };
  }

  // 4. Build work intervals (excluding break)
  const workStart = timeToMinutes(daySchedule.startTime);
  const workEnd = timeToMinutes(daySchedule.endTime);

  let workIntervals: TimeInterval[] = [];

  if (daySchedule.breakStart && daySchedule.breakEnd) {
    const breakStart = timeToMinutes(daySchedule.breakStart);
    const breakEnd = timeToMinutes(daySchedule.breakEnd);

    // Before break
    if (workStart < breakStart) {
      workIntervals.push({ startMinutes: workStart, endMinutes: breakStart });
    }
    // After break
    if (breakEnd < workEnd) {
      workIntervals.push({ startMinutes: breakEnd, endMinutes: workEnd });
    }
  } else {
    workIntervals.push({ startMinutes: workStart, endMinutes: workEnd });
  }

  // 5. Get blocked times for this day
  const dayStart = new Date(date + "T00:00:00");
  const dayEnd = new Date(date + "T23:59:59");

  const blockedList = await getBlockedTimesByEstablishment(establishmentId, {
    professionalId: undefined, // Get all blocked times
    dateFrom: dayStart,
    dateTo: dayEnd,
    activeOnly: true,
  });

  // Filter blocked times that affect this professional (professionalId matches or is null = affects all)
  const relevantBlocked = blockedList.filter(
    (bt) => bt.professionalId === null || bt.professionalId === professionalId
  );

  // Convert blocked times to minute intervals within the day
  const blockedIntervals: TimeInterval[] = relevantBlocked.map((bt) => {
    const btStart = new Date(bt.startDatetime);
    const btEnd = new Date(bt.endDatetime);

    // Clamp to the current day
    const clampedStart = btStart < dayStart ? 0 : btStart.getHours() * 60 + btStart.getMinutes();
    const clampedEnd = btEnd > dayEnd ? 24 * 60 : btEnd.getHours() * 60 + btEnd.getMinutes();

    return { startMinutes: clampedStart, endMinutes: clampedEnd };
  });

  // 6. Get existing appointments (pending/confirmed) for this professional on this date
  const existingAppointments = await getAppointmentsByProfessionalAndDateRange(
    professionalId,
    establishmentId,
    dayStart,
    dayEnd
  );

  const appointmentIntervals: TimeInterval[] = existingAppointments.map((appt) => {
    const apptStart = new Date(appt.startDatetime);
    const apptEnd = new Date(appt.endDatetime);

    return {
      startMinutes: apptStart.getHours() * 60 + apptStart.getMinutes(),
      endMinutes: apptEnd.getHours() * 60 + apptEnd.getMinutes(),
    };
  });

  // 7. Generate candidate slots in 10-minute grid
  const now = new Date();
  const isToday =
    now.getFullYear() === targetDate.getFullYear() &&
    now.getMonth() === targetDate.getMonth() &&
    now.getDate() === targetDate.getDate();

  const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0;

  const availableSlots: AvailableSlot[] = [];

  for (const interval of workIntervals) {
    let slotStart = interval.startMinutes;

    while (slotStart + durationMinutes <= interval.endMinutes) {
      const slotEnd = slotStart + durationMinutes;

      // 8. Check all elimination criteria

      // 8a. Skip if slot is in the past (for today)
      if (isToday && slotStart < currentMinutes) {
        slotStart += SLOT_INTERVAL_MINUTES;
        continue;
      }

      // 8b. Check overlap with blocked times
      const blockedConflict = blockedIntervals.some((bi) =>
        hasOverlap(bi.startMinutes, bi.endMinutes, slotStart, slotEnd)
      );

      if (blockedConflict) {
        slotStart += SLOT_INTERVAL_MINUTES;
        continue;
      }

      // 8c. Check overlap with existing appointments
      const appointmentConflict = appointmentIntervals.some((ai) =>
        hasOverlap(ai.startMinutes, ai.endMinutes, slotStart, slotEnd)
      );

      if (appointmentConflict) {
        slotStart += SLOT_INTERVAL_MINUTES;
        continue;
      }

      // Slot is available!
      availableSlots.push({
        start: minutesToTime(slotStart),
        end: minutesToTime(slotEnd),
      });

      slotStart += SLOT_INTERVAL_MINUTES;
    }
  }

  return {
    slots: availableSlots,
    durationMinutes,
    effectivePrice: effectivePrice ?? "0",
  };
}
