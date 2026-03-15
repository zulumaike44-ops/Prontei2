/**
 * NOTIFICATION SERVICE — Notificações de agendamento
 *
 * Escuta eventos do eventBus e dispara notificações.
 * MVP: loga no console. Preparado para email/SMS/WhatsApp futuros.
 */

import { appointmentEventBus, type AppointmentEventPayload } from "./eventBus";
import { notifyOwner } from "./_core/notification";

// ============================================================
// TEMPLATES PT-BR
// ============================================================

function confirmationMessage(p: AppointmentEventPayload): { title: string; content: string } {
  return {
    title: `Novo agendamento: ${p.customerName}`,
    content: [
      `Novo agendamento confirmado no ${p.establishmentName}!`,
      ``,
      `Serviço: ${p.serviceName}`,
      `Profissional: ${p.professionalName}`,
      `Data: ${p.date}`,
      `Horário: ${p.time}`,
      `Duração: ${p.durationMinutes} min`,
      `Valor: ${p.price}`,
      ``,
      `Cliente: ${p.customerName} (${p.customerPhone})`,
    ].join("\n"),
  };
}

function cancellationMessage(p: AppointmentEventPayload): { title: string; content: string } {
  return {
    title: `Agendamento cancelado: ${p.customerName || "Cliente"}`,
    content: [
      `Um agendamento foi cancelado no ${p.establishmentName}.`,
      ``,
      `Serviço: ${p.serviceName}`,
      `Profissional: ${p.professionalName}`,
      `Data: ${p.date}`,
      `Horário: ${p.time}`,
      p.cancellationReason ? `Motivo: ${p.cancellationReason}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function rescheduleMessage(p: AppointmentEventPayload): { title: string; content: string } {
  return {
    title: `Agendamento reagendado: ${p.customerName || "Cliente"}`,
    content: [
      `Um agendamento foi reagendado no ${p.establishmentName}.`,
      ``,
      `Serviço: ${p.serviceName}`,
      `Profissional: ${p.professionalName}`,
      p.previousDate ? `Data anterior: ${p.previousDate} às ${p.previousTime}` : "",
      `Nova data: ${p.date}`,
      `Novo horário: ${p.time}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

// ============================================================
// NOTIFICATION DISPATCHER
// ============================================================

async function handleAppointmentCreated(payload: AppointmentEventPayload) {
  console.log(`[Notification] Agendamento criado: #${payload.appointmentId} - ${payload.customerName}`);

  try {
    const msg = confirmationMessage(payload);
    await notifyOwner(msg);
  } catch (error) {
    console.warn("[Notification] Falha ao notificar owner sobre novo agendamento:", error);
  }
}

async function handleAppointmentCancelled(payload: AppointmentEventPayload) {
  console.log(`[Notification] Agendamento cancelado: #${payload.appointmentId}`);

  try {
    const msg = cancellationMessage(payload);
    await notifyOwner(msg);
  } catch (error) {
    console.warn("[Notification] Falha ao notificar owner sobre cancelamento:", error);
  }
}

async function handleAppointmentRescheduled(payload: AppointmentEventPayload) {
  console.log(`[Notification] Agendamento reagendado: #${payload.appointmentId}`);

  try {
    const msg = rescheduleMessage(payload);
    await notifyOwner(msg);
  } catch (error) {
    console.warn("[Notification] Falha ao notificar owner sobre reagendamento:", error);
  }
}

// ============================================================
// INITIALIZATION
// ============================================================

let initialized = false;

export function initNotificationService() {
  if (initialized) return;

  appointmentEventBus.onAppointmentCreated(handleAppointmentCreated);
  appointmentEventBus.onAppointmentCancelled(handleAppointmentCancelled);
  appointmentEventBus.onAppointmentRescheduled(handleAppointmentRescheduled);

  initialized = true;
  console.log("[NotificationService] Inicializado — escutando eventos de agendamento.");
}

// Export for testing
export { confirmationMessage, cancellationMessage, rescheduleMessage };
