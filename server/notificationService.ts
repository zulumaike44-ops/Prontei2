/**
 * NOTIFICATION SERVICE — Notificações de agendamento
 *
 * Escuta eventos do eventBus e dispara notificações.
 * MVP: loga no console. Preparado para email/SMS/WhatsApp futuros.
 */

import { appointmentEventBus, type AppointmentEventPayload } from "./eventBus";
import { notifyOwner } from "./_core/notification";
import { getWhatsappSettings } from "./whatsappDb";
import { sendWhatsappMessage } from "./whatsappWebhook";

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

function customerConfirmationMessage(p: AppointmentEventPayload): string {
  return [
    `Olá ${p.customerName}, seu agendamento está confirmado! 🎉`,
    ``,
    `🏢 *${p.establishmentName}*`,
    `✂️ Serviço: ${p.serviceName}`,
    `👤 Profissional: ${p.professionalName}`,
    `📅 Data: ${p.date}`,
    `⏰ Horário: ${p.time}`,
    ``,
    `Para gerenciar seu agendamento (cancelar ou reagendar), acesse:`,
    `https://prontei.com.br/meus-agendamentos`
  ].join("\n");
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

function customerCancellationMessage(p: AppointmentEventPayload): string {
  return [
    `Olá ${p.customerName}, seu agendamento foi cancelado.`,
    ``,
    `🏢 *${p.establishmentName}*`,
    `✂️ Serviço: ${p.serviceName}`,
    `📅 Data: ${p.date}`,
    `⏰ Horário: ${p.time}`,
    ``,
    `Esperamos te ver em breve! Para fazer um novo agendamento, acesse nosso link.`
  ].join("\n");
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

function customerRescheduleMessage(p: AppointmentEventPayload): string {
  return [
    `Olá ${p.customerName}, seu agendamento foi alterado com sucesso! 🔄`,
    ``,
    `🏢 *${p.establishmentName}*`,
    `✂️ Serviço: ${p.serviceName}`,
    `👤 Profissional: ${p.professionalName}`,
    `📅 Nova Data: ${p.date}`,
    `⏰ Novo Horário: ${p.time}`,
    ``,
    `Para gerenciar seu agendamento, acesse:`,
    `https://prontei.com.br/meus-agendamentos`
  ].join("\n");
}

// ============================================================
// NOTIFICATION DISPATCHER
// ============================================================

async function notifyCustomerViaWhatsapp(establishmentId: number, customerPhone: string, message: string) {
  try {
    // Buscar configurações do WhatsApp do estabelecimento
    const settings = await getWhatsappSettings(establishmentId);
    
    if (!settings || settings.status !== "connected" || !settings.phoneNumberId || !settings.accessToken) {
      console.log(`[Notification] WhatsApp não configurado ou desconectado para o estabelecimento ${establishmentId}`);
      return;
    }
    
    // Enviar mensagem
    const result = await sendWhatsappMessage(
      settings.phoneNumberId,
      settings.accessToken,
      customerPhone,
      message
    );
    
    if (result.success) {
      console.log(`[Notification] Mensagem WhatsApp enviada com sucesso para ${customerPhone}`);
    } else {
      console.warn(`[Notification] Falha ao enviar WhatsApp para ${customerPhone}:`, result.error);
    }
  } catch (error) {
    console.error(`[Notification] Erro ao tentar enviar WhatsApp para ${customerPhone}:`, error);
  }
}

async function handleAppointmentCreated(payload: AppointmentEventPayload) {
  console.log(`[Notification] Agendamento criado: #${payload.appointmentId} - ${payload.customerName}`);

  // 1. Notificar o dono (painel/email)
  try {
    const msg = confirmationMessage(payload);
    await notifyOwner(msg);
  } catch (error) {
    console.warn("[Notification] Falha ao notificar owner sobre novo agendamento:", error);
  }
  
  // 2. Notificar o cliente via WhatsApp
  if (payload.customerPhone) {
    const customerMsg = customerConfirmationMessage(payload);
    await notifyCustomerViaWhatsapp(payload.establishmentId, payload.customerPhone, customerMsg);
  }
}

async function handleAppointmentCancelled(payload: AppointmentEventPayload) {
  console.log(`[Notification] Agendamento cancelado: #${payload.appointmentId}`);

  // 1. Notificar o dono
  try {
    const msg = cancellationMessage(payload);
    await notifyOwner(msg);
  } catch (error) {
    console.warn("[Notification] Falha ao notificar owner sobre cancelamento:", error);
  }
  
  // 2. Notificar o cliente via WhatsApp
  if (payload.customerPhone) {
    const customerMsg = customerCancellationMessage(payload);
    await notifyCustomerViaWhatsapp(payload.establishmentId, payload.customerPhone, customerMsg);
  }
}

async function handleAppointmentRescheduled(payload: AppointmentEventPayload) {
  console.log(`[Notification] Agendamento reagendado: #${payload.appointmentId}`);

  // 1. Notificar o dono
  try {
    const msg = rescheduleMessage(payload);
    await notifyOwner(msg);
  } catch (error) {
    console.warn("[Notification] Falha ao notificar owner sobre reagendamento:", error);
  }
  
  // 2. Notificar o cliente via WhatsApp
  if (payload.customerPhone) {
    const customerMsg = customerRescheduleMessage(payload);
    await notifyCustomerViaWhatsapp(payload.establishmentId, payload.customerPhone, customerMsg);
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
