/**
 * PUBLIC APPOINTMENT SERVICE — Criação, cancelamento e reagendamento público
 *
 * Encapsula a lógica de negócio do agendamento público.
 * Emite eventos via eventBus para notificações.
 */

import crypto from "crypto";
import {
  getEstablishmentBySlug,
  getEstablishmentById,
  getProfessionalById,
  getServiceById,
  getProfessionalServiceLinks,
  getCustomerByNormalizedPhone,
  createCustomer,
} from "./db";
import {
  createAppointment,
  getAppointmentByManageToken,
  checkAppointmentConflict,
  updateAppointmentStatus,
  updateAppointment,
} from "./appointmentDb";
import { appointmentEventBus, type AppointmentEventPayload } from "./eventBus";

// ============================================================
// HELPERS
// ============================================================

function generateManageToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function normalizePhonePublic(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (!digits.startsWith("55")) {
    digits = "55" + digits;
  }
  return digits;
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatDateFromDatetime(dt: Date): string {
  const d = String(dt.getDate()).padStart(2, "0");
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const y = dt.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatTimeFromDatetime(dt: Date): string {
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

// ============================================================
// TYPES
// ============================================================

export interface CreateAppointmentInput {
  slug: string;
  professionalId: number;
  serviceId: number;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
}

export interface CreateAppointmentResult {
  success: boolean;
  appointment: {
    id: number;
    manageToken: string;
    professionalName: string;
    serviceName: string;
    date: string;
    time: string;
    durationMinutes: number;
    price: string;
    status: string;
    establishmentName: string;
    establishmentPhone: string | null;
  };
}

export interface CancelResult {
  success: boolean;
  status: string;
  message: string;
}

export interface RescheduleResult {
  success: boolean;
  appointment: {
    id: number;
    date: string;
    time: string;
    professionalName: string;
    serviceName: string;
    durationMinutes: number;
    price: string;
    status: string;
  };
  message: string;
}

// ============================================================
// SERVICE
// ============================================================

export async function createPublicAppointment(
  input: CreateAppointmentInput
): Promise<CreateAppointmentResult> {
  const { slug, professionalId, serviceId, date, time, customerName, customerPhone, notes } = input;

  const establishment = await getEstablishmentBySlug(slug);
  if (!establishment) throw new Error("Estabelecimento não encontrado.");

  const professional = await getProfessionalById(professionalId, establishment.id);
  if (!professional) throw new Error("Profissional não encontrado.");

  const service = await getServiceById(serviceId, establishment.id);
  if (!service) throw new Error("Serviço não encontrado.");

  // Get effective duration and price
  const links = await getProfessionalServiceLinks(professionalId, establishment.id);
  const link = links.find((l) => l.serviceId === serviceId && l.isActive);
  if (!link) throw new Error("Este profissional não realiza este serviço.");

  const durationMinutes = link.customDurationMinutes ?? link.serviceDurationMinutes;
  const effectivePrice = link.customPrice ?? link.servicePrice;

  if (!durationMinutes || durationMinutes <= 0) {
    throw new Error("Duração do serviço inválida.");
  }

  // Build start/end datetimes
  const startDatetime = new Date(`${date}T${time}:00`);
  const endDatetime = new Date(startDatetime.getTime() + durationMinutes * 60 * 1000);

  if (startDatetime.getTime() < Date.now()) {
    throw new Error("Não é possível agendar no passado.");
  }

  // Check for conflicts
  const conflicts = await checkAppointmentConflict(
    professionalId,
    establishment.id,
    startDatetime,
    endDatetime
  );

  if (conflicts.length > 0) {
    throw new Error("Este horário não está mais disponível. Por favor, escolha outro.");
  }

  // Find or create customer
  const normalizedPhoneValue = normalizePhonePublic(customerPhone);
  let customer = await getCustomerByNormalizedPhone(normalizedPhoneValue, establishment.id);

  if (!customer) {
    customer = await createCustomer({
      establishmentId: establishment.id,
      name: customerName,
      phone: customerPhone,
      normalizedPhone: normalizedPhoneValue,
    });
  }

  if (!customer) throw new Error("Erro ao criar cliente.");

  // Generate manage token
  const manageToken = generateManageToken();

  // Create appointment
  const appointment = await createAppointment({
    establishmentId: establishment.id,
    professionalId,
    serviceId,
    customerId: customer.id,
    startDatetime,
    endDatetime,
    durationMinutes,
    price: effectivePrice ?? "0",
    status: "confirmed",
    source: "online",
    notes: notes || null,
    manageToken,
  });

  if (!appointment) throw new Error("Erro ao criar agendamento.");

  const priceBR = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    parseFloat(effectivePrice ?? "0")
  );

  // Emit event
  const eventPayload: AppointmentEventPayload = {
    appointmentId: appointment.id,
    establishmentId: establishment.id,
    establishmentName: establishment.name,
    professionalName: professional.name,
    serviceName: service.name,
    customerName,
    customerPhone,
    date: formatDateBR(date),
    time,
    durationMinutes,
    price: priceBR,
    manageToken,
  };

  appointmentEventBus.emitAppointmentEvent("appointment.created", eventPayload);

  return {
    success: true,
    appointment: {
      id: appointment.id,
      manageToken,
      professionalName: professional.name,
      serviceName: service.name,
      date,
      time,
      durationMinutes,
      price: priceBR,
      status: "confirmed",
      establishmentName: establishment.name,
      establishmentPhone: establishment.phone,
    },
  };
}

export async function cancelByToken(
  token: string,
  reason?: string
): Promise<CancelResult> {
  const appointment = await getAppointmentByManageToken(token);
  if (!appointment) throw new Error("Agendamento não encontrado.");

  if (!["pending", "confirmed"].includes(appointment.status)) {
    throw new Error("Este agendamento não pode ser cancelado.");
  }

  if (new Date(appointment.startDatetime).getTime() < Date.now()) {
    throw new Error("Não é possível cancelar um agendamento que já passou.");
  }

  const updated = await updateAppointmentStatus(
    appointment.id,
    appointment.establishmentId,
    "cancelled",
    null,
    reason || "Cancelado pelo cliente via link"
  );

  // Emit event
  const professional = await getProfessionalById(appointment.professionalId, appointment.establishmentId);
  const service = await getServiceById(appointment.serviceId, appointment.establishmentId);
  const establishment = await getEstablishmentById(appointment.establishmentId);

  if (establishment && professional && service) {
    const eventPayload: AppointmentEventPayload = {
      appointmentId: appointment.id,
      establishmentId: appointment.establishmentId,
      establishmentName: establishment.name,
      professionalName: professional.name,
      serviceName: service.name,
      customerName: "", // not available from appointment alone
      customerPhone: "",
      date: formatDateFromDatetime(new Date(appointment.startDatetime)),
      time: formatTimeFromDatetime(new Date(appointment.startDatetime)),
      durationMinutes: appointment.durationMinutes,
      price: appointment.price,
      manageToken: token,
      cancellationReason: reason,
    };

    appointmentEventBus.emitAppointmentEvent("appointment.cancelled", eventPayload);
  }

  return {
    success: true,
    status: updated?.status ?? "cancelled",
    message: "Agendamento cancelado com sucesso.",
  };
}

export async function rescheduleByToken(
  token: string,
  input: { date: string; time: string; professionalId?: number }
): Promise<RescheduleResult> {
  const { date, time, professionalId } = input;

  const appointment = await getAppointmentByManageToken(token);
  if (!appointment) throw new Error("Agendamento não encontrado.");

  if (!["pending", "confirmed"].includes(appointment.status)) {
    throw new Error("Este agendamento não pode ser reagendado.");
  }

  const targetProfId = professionalId ?? appointment.professionalId;

  const newStart = new Date(`${date}T${time}:00`);
  const newEnd = new Date(newStart.getTime() + appointment.durationMinutes * 60 * 1000);

  if (newStart.getTime() < Date.now()) {
    throw new Error("Não é possível reagendar para o passado.");
  }

  const conflicts = await checkAppointmentConflict(
    targetProfId,
    appointment.establishmentId,
    newStart,
    newEnd,
    appointment.id
  );

  if (conflicts.length > 0) {
    throw new Error("Este horário não está mais disponível. Por favor, escolha outro.");
  }

  // Save previous date/time for event
  const previousDate = formatDateFromDatetime(new Date(appointment.startDatetime));
  const previousTime = formatTimeFromDatetime(new Date(appointment.startDatetime));

  const updated = await updateAppointment(
    appointment.id,
    appointment.establishmentId,
    {
      professionalId: targetProfId,
      startDatetime: newStart,
      endDatetime: newEnd,
    }
  );

  const professional = await getProfessionalById(targetProfId, appointment.establishmentId);
  const service = await getServiceById(appointment.serviceId, appointment.establishmentId);
  const establishment = await getEstablishmentById(appointment.establishmentId);

  // Emit event
  if (establishment && professional && service) {
    const eventPayload: AppointmentEventPayload = {
      appointmentId: appointment.id,
      establishmentId: appointment.establishmentId,
      establishmentName: establishment.name,
      professionalName: professional.name,
      serviceName: service.name,
      customerName: "",
      customerPhone: "",
      date: formatDateBR(date),
      time,
      durationMinutes: appointment.durationMinutes,
      price: appointment.price,
      manageToken: token,
      previousDate,
      previousTime,
    };

    appointmentEventBus.emitAppointmentEvent("appointment.rescheduled", eventPayload);
  }

  return {
    success: true,
    appointment: {
      id: updated?.id ?? appointment.id,
      date,
      time,
      professionalName: professional?.name ?? "N/A",
      serviceName: service?.name ?? "N/A",
      durationMinutes: appointment.durationMinutes,
      price: appointment.price,
      status: updated?.status ?? appointment.status,
    },
    message: "Agendamento reagendado com sucesso.",
  };
}

/**
 * Busca dados de um agendamento pelo token para exibição pública.
 */
export async function getAppointmentByTokenPublic(token: string) {
  const appointment = await getAppointmentByManageToken(token);
  if (!appointment) return null;

  const professional = await getProfessionalById(appointment.professionalId, appointment.establishmentId);
  const service = await getServiceById(appointment.serviceId, appointment.establishmentId);
  const establishment = await getEstablishmentById(appointment.establishmentId);

  return {
    id: appointment.id,
    status: appointment.status,
    date: appointment.startDatetime,
    endDate: appointment.endDatetime,
    durationMinutes: appointment.durationMinutes,
    price: appointment.price,
    notes: appointment.notes,
    source: appointment.source,
    professionalName: professional?.name ?? "N/A",
    professionalId: appointment.professionalId,
    serviceName: service?.name ?? "N/A",
    serviceId: appointment.serviceId,
    establishmentName: establishment?.name ?? "N/A",
    establishmentSlug: establishment?.slug ?? "",
    establishmentPhone: establishment?.phone ?? "",
    manageToken: token,
    cancelledAt: appointment.cancelledAt,
    cancellationReason: appointment.cancellationReason,
  };
}
