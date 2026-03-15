/**
 * PUBLIC ROUTER — APIs públicas de agendamento (sem autenticação)
 *
 * Endpoints Express (não tRPC) para acesso público:
 * - GET  /api/public/booking/:slug     → dados do establishment
 * - GET  /api/public/availability      → horários disponíveis
 * - POST /api/public/appointments      → criar agendamento
 * - GET  /api/public/appointments/:token → ver agendamento por token
 * - POST /api/public/appointments/:token/cancel    → cancelar
 * - POST /api/public/appointments/:token/reschedule → reagendar
 * - GET  /api/public/appointments/history → histórico por telefone
 */

import type { Request, Response, Router } from "express";
import crypto from "crypto";
import {
  getEstablishmentBySlug,
  getEstablishmentById,
  getProfessionalsByEstablishment,
  getServicesByEstablishment,
  getServiceById,
  getProfessionalById,
  getProfessionalServiceLinks,
  getServiceProfessionalLinks,
  normalizePhone,
  getCustomerByNormalizedPhone,
  createCustomer,
} from "./db";
import {
  createAppointment,
  getAppointmentByManageToken,
  getAppointmentsByCustomerPhone,
  checkAppointmentConflict,
  updateAppointmentStatus,
  updateAppointment,
} from "./appointmentDb";
import { calculateAvailableSlots } from "./availability";

// ============================================================
// HELPERS
// ============================================================

function generateManageToken(): string {
  return crypto.randomBytes(32).toString("hex"); // 64 chars
}

function sendError(res: Response, status: number, message: string) {
  return res.status(status).json({ error: message });
}

function normalizePhonePublic(phone: string): string {
  // Remove tudo que não é dígito
  let digits = phone.replace(/\D/g, "");
  // Adiciona 55 se não começar com 55
  if (!digits.startsWith("55")) {
    digits = "55" + digits;
  }
  return digits;
}

// ============================================================
// ROUTE HANDLERS
// ============================================================

/**
 * GET /api/public/booking/:slug
 * Retorna dados do establishment para a página de agendamento público.
 */
async function handleGetBookingData(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    if (!slug) return sendError(res, 400, "Slug é obrigatório.");

    const establishment = await getEstablishmentBySlug(slug);
    if (!establishment) return sendError(res, 404, "Estabelecimento não encontrado.");

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

    return res.json({
      establishment: {
        id: establishment.id,
        name: establishment.name,
        slug: establishment.slug,
        description: establishment.description,
        logoUrl: establishment.logoUrl,
        phone: establishment.phone,
        addressCity: establishment.addressCity,
        addressState: establishment.addressState,
        addressStreet: establishment.addressStreet,
        addressNumber: establishment.addressNumber,
        addressNeighborhood: establishment.addressNeighborhood,
        timezone: establishment.timezone,
      },
      professionals: activeProfessionals.map((p) => ({
        id: p.id,
        name: p.name,
        avatarUrl: p.avatarUrl,
        bio: p.bio,
        serviceIds: professionalServiceMap[p.id] ?? [],
      })),
      services: activeServices.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        durationMinutes: s.durationMinutes,
        price: s.price,
        category: s.category,
      })),
    });
  } catch (error) {
    console.error("[Public Booking] Error:", error);
    return sendError(res, 500, "Erro interno do servidor.");
  }
}

/**
 * GET /api/public/availability
 * Query params: slug, professionalId, serviceId, date (YYYY-MM-DD)
 */
async function handleGetAvailability(req: Request, res: Response) {
  try {
    const { slug, professionalId, serviceId, date } = req.query;

    if (!slug || !professionalId || !serviceId || !date) {
      return sendError(res, 400, "Parâmetros obrigatórios: slug, professionalId, serviceId, date.");
    }

    const establishment = await getEstablishmentBySlug(slug as string);
    if (!establishment) return sendError(res, 404, "Estabelecimento não encontrado.");

    const profId = parseInt(professionalId as string, 10);
    const svcId = parseInt(serviceId as string, 10);
    const dateStr = date as string;

    if (isNaN(profId) || isNaN(svcId)) {
      return sendError(res, 400, "IDs inválidos.");
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return sendError(res, 400, "Formato de data inválido. Use YYYY-MM-DD.");
    }

    // Validate professional belongs to establishment
    const professional = await getProfessionalById(profId, establishment.id);
    if (!professional) return sendError(res, 404, "Profissional não encontrado.");

    // Validate service belongs to establishment
    const service = await getServiceById(svcId, establishment.id);
    if (!service) return sendError(res, 404, "Serviço não encontrado.");

    const result = await calculateAvailableSlots({
      professionalId: profId,
      serviceId: svcId,
      date: dateStr,
      establishmentId: establishment.id,
    });

    return res.json(result);
  } catch (error) {
    console.error("[Public Availability] Error:", error);
    return sendError(res, 500, "Erro interno do servidor.");
  }
}

/**
 * POST /api/public/appointments
 * Body: { slug, professionalId, serviceId, date, time, customerName, customerPhone, notes? }
 */
async function handleCreateAppointment(req: Request, res: Response) {
  try {
    const { slug, professionalId, serviceId, date, time, customerName, customerPhone, notes } = req.body;

    // Validate required fields
    if (!slug || !professionalId || !serviceId || !date || !time || !customerName || !customerPhone) {
      return sendError(res, 400, "Campos obrigatórios: slug, professionalId, serviceId, date, time, customerName, customerPhone.");
    }

    const establishment = await getEstablishmentBySlug(slug);
    if (!establishment) return sendError(res, 404, "Estabelecimento não encontrado.");

    const profId = parseInt(professionalId, 10);
    const svcId = parseInt(serviceId, 10);

    // Validate professional and service
    const professional = await getProfessionalById(profId, establishment.id);
    if (!professional) return sendError(res, 404, "Profissional não encontrado.");

    const service = await getServiceById(svcId, establishment.id);
    if (!service) return sendError(res, 404, "Serviço não encontrado.");

    // Get effective duration and price
    const links = await getProfessionalServiceLinks(profId, establishment.id);
    const link = links.find((l) => l.serviceId === svcId && l.isActive);
    if (!link) return sendError(res, 400, "Este profissional não realiza este serviço.");

    const durationMinutes = link.customDurationMinutes ?? link.serviceDurationMinutes;
    const effectivePrice = link.customPrice ?? link.servicePrice;

    if (!durationMinutes || durationMinutes <= 0) {
      return sendError(res, 400, "Duração do serviço inválida.");
    }

    // Build start/end datetimes
    const startDatetime = new Date(`${date}T${time}:00`);
    const endDatetime = new Date(startDatetime.getTime() + durationMinutes * 60 * 1000);

    // Check if slot is in the past
    if (startDatetime.getTime() < Date.now()) {
      return sendError(res, 400, "Não é possível agendar no passado.");
    }

    // Check for conflicts
    const conflicts = await checkAppointmentConflict(
      profId,
      establishment.id,
      startDatetime,
      endDatetime
    );

    if (conflicts.length > 0) {
      return sendError(res, 409, "Este horário não está mais disponível. Por favor, escolha outro.");
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

    if (!customer) return sendError(res, 500, "Erro ao criar cliente.");

    // Generate manage token
    const manageToken = generateManageToken();

    // Create appointment
    const appointment = await createAppointment({
      establishmentId: establishment.id,
      professionalId: profId,
      serviceId: svcId,
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

    return res.status(201).json({
      success: true,
      appointment: {
        id: appointment?.id,
        manageToken,
        professionalName: professional.name,
        serviceName: service.name,
        date,
        time,
        durationMinutes,
        price: effectivePrice,
        status: "confirmed",
        establishmentName: establishment.name,
        establishmentPhone: establishment.phone,
      },
    });
  } catch (error) {
    console.error("[Public Create Appointment] Error:", error);
    return sendError(res, 500, "Erro interno do servidor.");
  }
}

/**
 * GET /api/public/appointments/:token
 * Retorna dados de um agendamento pelo manageToken.
 */
async function handleGetAppointmentByToken(req: Request, res: Response) {
  try {
    const { token } = req.params;
    if (!token) return sendError(res, 400, "Token é obrigatório.");

    const appointment = await getAppointmentByManageToken(token);
    if (!appointment) return sendError(res, 404, "Agendamento não encontrado.");

    // Get related data
    const professional = await getProfessionalById(appointment.professionalId, appointment.establishmentId);
    const service = await getServiceById(appointment.serviceId, appointment.establishmentId);
    const establishment = await getEstablishmentById(appointment.establishmentId);

    return res.json({
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
    });
  } catch (error) {
    console.error("[Public Get Appointment] Error:", error);
    return sendError(res, 500, "Erro interno do servidor.");
  }
}

/**
 * POST /api/public/appointments/:token/cancel
 * Body: { reason? }
 */
async function handleCancelAppointment(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const { reason } = req.body || {};

    if (!token) return sendError(res, 400, "Token é obrigatório.");

    const appointment = await getAppointmentByManageToken(token);
    if (!appointment) return sendError(res, 404, "Agendamento não encontrado.");

    // Can only cancel pending/confirmed
    if (!["pending", "confirmed"].includes(appointment.status)) {
      return sendError(res, 400, "Este agendamento não pode ser cancelado.");
    }

    // Check if appointment is in the past
    if (new Date(appointment.startDatetime).getTime() < Date.now()) {
      return sendError(res, 400, "Não é possível cancelar um agendamento que já passou.");
    }

    const updated = await updateAppointmentStatus(
      appointment.id,
      appointment.establishmentId,
      "cancelled",
      null,
      reason || "Cancelado pelo cliente via link"
    );

    return res.json({
      success: true,
      status: updated?.status ?? "cancelled",
      message: "Agendamento cancelado com sucesso.",
    });
  } catch (error) {
    console.error("[Public Cancel] Error:", error);
    return sendError(res, 500, "Erro interno do servidor.");
  }
}

/**
 * POST /api/public/appointments/:token/reschedule
 * Body: { date, time, professionalId? }
 */
async function handleRescheduleAppointment(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const { date, time, professionalId } = req.body || {};

    if (!token) return sendError(res, 400, "Token é obrigatório.");
    if (!date || !time) return sendError(res, 400, "Data e horário são obrigatórios.");

    const appointment = await getAppointmentByManageToken(token);
    if (!appointment) return sendError(res, 404, "Agendamento não encontrado.");

    // Can only reschedule pending/confirmed
    if (!["pending", "confirmed"].includes(appointment.status)) {
      return sendError(res, 400, "Este agendamento não pode ser reagendado.");
    }

    const targetProfId = professionalId ? parseInt(professionalId, 10) : appointment.professionalId;

    // Build new start/end
    const newStart = new Date(`${date}T${time}:00`);
    const newEnd = new Date(newStart.getTime() + appointment.durationMinutes * 60 * 1000);

    // Check if new slot is in the past
    if (newStart.getTime() < Date.now()) {
      return sendError(res, 400, "Não é possível reagendar para o passado.");
    }

    // Check for conflicts (excluding current appointment)
    const conflicts = await checkAppointmentConflict(
      targetProfId,
      appointment.establishmentId,
      newStart,
      newEnd,
      appointment.id
    );

    if (conflicts.length > 0) {
      return sendError(res, 409, "Este horário não está mais disponível. Por favor, escolha outro.");
    }

    // Update appointment
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

    return res.json({
      success: true,
      appointment: {
        id: updated?.id,
        date,
        time,
        professionalName: professional?.name ?? "N/A",
        serviceName: service?.name ?? "N/A",
        durationMinutes: appointment.durationMinutes,
        price: appointment.price,
        status: updated?.status,
      },
      message: "Agendamento reagendado com sucesso.",
    });
  } catch (error) {
    console.error("[Public Reschedule] Error:", error);
    return sendError(res, 500, "Erro interno do servidor.");
  }
}

/**
 * GET /api/public/appointments/history
 * Query params: slug, phone
 */
async function handleGetAppointmentHistory(req: Request, res: Response) {
  try {
    const { slug, phone } = req.query;

    if (!slug || !phone) {
      return sendError(res, 400, "Parâmetros obrigatórios: slug, phone.");
    }

    const establishment = await getEstablishmentBySlug(slug as string);
    if (!establishment) return sendError(res, 404, "Estabelecimento não encontrado.");

    const normalizedPhoneValue = normalizePhonePublic(phone as string);
    const appointmentsList = await getAppointmentsByCustomerPhone(
      establishment.id,
      normalizedPhoneValue
    );

    // Enrich with professional and service names
    const enriched = await Promise.all(
      appointmentsList.map(async (appt) => {
        const professional = await getProfessionalById(appt.professionalId, establishment.id);
        const service = await getServiceById(appt.serviceId, establishment.id);
        return {
          id: appt.id,
          date: appt.startDatetime,
          endDate: appt.endDatetime,
          durationMinutes: appt.durationMinutes,
          price: appt.price,
          status: appt.status,
          professionalName: professional?.name ?? "N/A",
          serviceName: service?.name ?? "N/A",
          manageToken: appt.manageToken,
        };
      })
    );

    return res.json({
      establishment: {
        name: establishment.name,
        slug: establishment.slug,
      },
      appointments: enriched,
    });
  } catch (error) {
    console.error("[Public History] Error:", error);
    return sendError(res, 500, "Erro interno do servidor.");
  }
}

// ============================================================
// REGISTER ROUTES
// ============================================================

export function registerPublicRoutes(expressRouter: Router) {
  expressRouter.get("/api/public/booking/:slug", handleGetBookingData);
  expressRouter.get("/api/public/availability", handleGetAvailability);
  expressRouter.post("/api/public/appointments", handleCreateAppointment);
  expressRouter.get("/api/public/appointments/history", handleGetAppointmentHistory);
  expressRouter.get("/api/public/appointments/:token", handleGetAppointmentByToken);
  expressRouter.post("/api/public/appointments/:token/cancel", handleCancelAppointment);
  expressRouter.post("/api/public/appointments/:token/reschedule", handleRescheduleAppointment);
}
