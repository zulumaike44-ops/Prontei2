/**
 * PUBLIC ROUTER — APIs públicas de agendamento (sem autenticação)
 *
 * Endpoints Express (não tRPC) para acesso público:
 * - GET  /api/public/booking/:slug                    → dados do establishment
 * - GET  /api/public/availability                     → horários disponíveis
 * - GET  /api/public/quickslots                       → melhores horários hoje/amanhã
 * - POST /api/public/appointments                     → criar agendamento
 * - GET  /api/public/appointments/:token              → ver agendamento por token
 * - POST /api/public/appointments/:token/cancel       → cancelar
 * - POST /api/public/appointments/:token/reschedule   → reagendar
 * - GET  /api/public/appointments/history             → histórico por telefone
 * - GET  /api/public/rebook                           → sugestão de rebook
 */

import type { Request, Response, Router } from "express";
import { getBookingPageData } from "./publicBookingService";
import { getDayAvailability, getQuickSlots } from "./publicAvailabilityService";
import {
  createPublicAppointment,
  cancelByToken,
  rescheduleByToken,
  getAppointmentByTokenPublic,
} from "./publicAppointmentService";
import { getLastBookingOptions } from "./rebookService";
import {
  getEstablishmentBySlug,
  getProfessionalById,
  getServiceById,
} from "./db";
import { getAppointmentsByCustomerPhone } from "./appointmentDb";

// ============================================================
// HELPERS
// ============================================================

function sendError(res: Response, status: number, message: string) {
  return res.status(status).json({ error: message });
}

function normalizePhonePublic(phone: string): string {
  let digits = phone.replace(/\D/g, "");
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
 */
async function handleGetBookingData(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    if (!slug) return sendError(res, 400, "Slug é obrigatório.");

    const data = await getBookingPageData(slug);
    if (!data) return sendError(res, 404, "Estabelecimento não encontrado.");

    return res.json(data);
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

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date as string)) {
      return sendError(res, 400, "Formato de data inválido. Use YYYY-MM-DD.");
    }

    const result = await getDayAvailability({
      slug: slug as string,
      professionalId: parseInt(professionalId as string, 10),
      serviceId: parseInt(serviceId as string, 10),
      date: date as string,
    });

    if (!result) return sendError(res, 404, "Estabelecimento ou profissional não encontrado.");

    return res.json(result);
  } catch (error) {
    console.error("[Public Availability] Error:", error);
    return sendError(res, 500, "Erro interno do servidor.");
  }
}

/**
 * GET /api/public/quickslots
 * Query params: slug, serviceId, professionalId? (opcional)
 */
async function handleGetQuickSlots(req: Request, res: Response) {
  try {
    const { slug, serviceId, professionalId } = req.query;

    if (!slug || !serviceId) {
      return sendError(res, 400, "Parâmetros obrigatórios: slug, serviceId.");
    }

    const result = await getQuickSlots({
      slug: slug as string,
      serviceId: parseInt(serviceId as string, 10),
      professionalId: professionalId ? parseInt(professionalId as string, 10) : undefined,
    });

    if (!result) return sendError(res, 404, "Estabelecimento não encontrado.");

    return res.json(result);
  } catch (error) {
    console.error("[Public QuickSlots] Error:", error);
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

    if (!slug || !professionalId || !serviceId || !date || !time || !customerName || !customerPhone) {
      return sendError(res, 400, "Campos obrigatórios: slug, professionalId, serviceId, date, time, customerName, customerPhone.");
    }

    const result = await createPublicAppointment({
      slug,
      professionalId: parseInt(professionalId, 10),
      serviceId: parseInt(serviceId, 10),
      date,
      time,
      customerName,
      customerPhone,
      notes,
    });

    return res.status(201).json(result);
  } catch (error: any) {
    console.error("[Public Create Appointment] Error:", error);
    const status = error.message?.includes("não está mais disponível") ? 409 : 400;
    return sendError(res, status, error.message || "Erro interno do servidor.");
  }
}

/**
 * GET /api/public/appointments/:token
 */
async function handleGetAppointmentByToken(req: Request, res: Response) {
  try {
    const { token } = req.params;
    if (!token) return sendError(res, 400, "Token é obrigatório.");

    const data = await getAppointmentByTokenPublic(token);
    if (!data) return sendError(res, 404, "Agendamento não encontrado.");

    return res.json(data);
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

    const result = await cancelByToken(token, reason);
    return res.json(result);
  } catch (error: any) {
    console.error("[Public Cancel] Error:", error);
    return sendError(res, 400, error.message || "Erro interno do servidor.");
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

    const result = await rescheduleByToken(token, { date, time, professionalId });
    return res.json(result);
  } catch (error: any) {
    console.error("[Public Reschedule] Error:", error);
    const status = error.message?.includes("não está mais disponível") ? 409 : 400;
    return sendError(res, status, error.message || "Erro interno do servidor.");
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

/**
 * GET /api/public/rebook
 * Query params: slug, phone
 */
async function handleGetRebook(req: Request, res: Response) {
  try {
    const { slug, phone } = req.query;

    if (!slug || !phone) {
      return sendError(res, 400, "Parâmetros obrigatórios: slug, phone.");
    }

    const establishment = await getEstablishmentBySlug(slug as string);
    if (!establishment) return sendError(res, 404, "Estabelecimento não encontrado.");

    const suggestion = await getLastBookingOptions(establishment.id, phone as string);
    if (!suggestion) return res.json({ suggestion: null });

    // Enrich with service and professional names
    const professional = await getProfessionalById(suggestion.professionalId, establishment.id);
    const service = await getServiceById(suggestion.serviceId, establishment.id);

    return res.json({
      suggestion: {
        ...suggestion,
        professionalName: professional?.name ?? "N/A",
        serviceName: service?.name ?? "N/A",
      },
    });
  } catch (error) {
    console.error("[Public Rebook] Error:", error);
    return sendError(res, 500, "Erro interno do servidor.");
  }
}

// ============================================================
// REGISTER ROUTES
// ============================================================

export function registerPublicRoutes(expressRouter: Router) {
  expressRouter.get("/api/public/booking/:slug", handleGetBookingData);
  expressRouter.get("/api/public/availability", handleGetAvailability);
  expressRouter.get("/api/public/quickslots", handleGetQuickSlots);
  expressRouter.post("/api/public/appointments", handleCreateAppointment);
  expressRouter.get("/api/public/appointments/history", handleGetAppointmentHistory);
  expressRouter.get("/api/public/rebook", handleGetRebook);
  expressRouter.get("/api/public/appointments/:token", handleGetAppointmentByToken);
  expressRouter.post("/api/public/appointments/:token/cancel", handleCancelAppointment);
  expressRouter.post("/api/public/appointments/:token/reschedule", handleRescheduleAppointment);
}
