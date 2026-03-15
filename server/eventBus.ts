/**
 * EVENT BUS — Sistema de eventos internos do Prontei
 *
 * Eventos simples via EventEmitter do Node.js (sem fila externa).
 * Dispara notificações quando agendamentos são criados, cancelados ou reagendados.
 */

import { EventEmitter } from "events";

// ============================================================
// TYPES
// ============================================================

export interface AppointmentEventPayload {
  appointmentId: number;
  establishmentId: number;
  establishmentName: string;
  professionalName: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  date: string; // "DD/MM/AAAA"
  time: string; // "HH:mm"
  durationMinutes: number;
  price: string;
  manageToken: string;
  /** Apenas para reschedule: dados anteriores */
  previousDate?: string;
  previousTime?: string;
  /** Apenas para cancel */
  cancellationReason?: string;
}

export type AppointmentEventType =
  | "appointment.created"
  | "appointment.cancelled"
  | "appointment.rescheduled";

// ============================================================
// EVENT BUS SINGLETON
// ============================================================

class AppointmentEventBus extends EventEmitter {
  emitAppointmentEvent(type: AppointmentEventType, payload: AppointmentEventPayload) {
    this.emit(type, payload);
  }

  onAppointmentCreated(handler: (payload: AppointmentEventPayload) => void) {
    this.on("appointment.created", handler);
  }

  onAppointmentCancelled(handler: (payload: AppointmentEventPayload) => void) {
    this.on("appointment.cancelled", handler);
  }

  onAppointmentRescheduled(handler: (payload: AppointmentEventPayload) => void) {
    this.on("appointment.rescheduled", handler);
  }
}

export const appointmentEventBus = new AppointmentEventBus();
