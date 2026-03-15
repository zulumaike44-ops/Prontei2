/**
 * REBOOK SERVICE — Sugere dados do último agendamento para agendar novamente
 *
 * Quando o cliente quer "agendar novamente", buscamos o último agendamento
 * dele no mesmo estabelecimento e sugerimos o mesmo serviço e profissional.
 */

import { getCustomerByNormalizedPhone } from "./db";
import { getAppointmentsByEstablishment } from "./appointmentDb";

// ============================================================
// TYPES
// ============================================================

export interface RebookSuggestion {
  serviceId: number;
  professionalId: number;
  customerName: string;
  customerPhone: string;
}

// ============================================================
// SERVICE
// ============================================================

function normalizePhonePublic(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (!digits.startsWith("55")) {
    digits = "55" + digits;
  }
  return digits;
}

/**
 * Busca o último agendamento do cliente (por telefone) no estabelecimento
 * e retorna sugestão de rebook (mesmo serviço e profissional).
 */
export async function getLastBookingOptions(
  establishmentId: number,
  phone: string
): Promise<RebookSuggestion | null> {
  const normalizedPhone = normalizePhonePublic(phone);
  const customer = await getCustomerByNormalizedPhone(normalizedPhone, establishmentId);

  if (!customer) return null;

  // Get all appointments for this customer, ordered by most recent
  const appointments = await getAppointmentsByEstablishment(establishmentId, {
    customerId: customer.id,
  });

  if (appointments.length === 0) return null;

  // Get the most recent appointment (already sorted desc by startDatetime)
  const lastAppointment = appointments[0];

  return {
    serviceId: lastAppointment.serviceId,
    professionalId: lastAppointment.professionalId,
    customerName: customer.name,
    customerPhone: customer.phone,
  };
}
