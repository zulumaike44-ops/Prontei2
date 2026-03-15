/**
 * APPOINTMENT DB QUERIES — Queries de banco para agendamentos (Etapa 15)
 */

import { eq, and, gte, lte, inArray, asc, desc, sql } from "drizzle-orm";
import {
  appointments,
  appointmentStatusHistory,
} from "../drizzle/schema";
import { getDb } from "./db";

// Status que ocupam a agenda (para detecção de conflito)
export const ACTIVE_APPOINTMENT_STATUSES = ["pending", "confirmed"] as const;

// Todos os status válidos
export const VALID_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
] as const;

export type AppointmentStatus = (typeof VALID_STATUSES)[number];

// ============================================================
// QUERIES
// ============================================================

/**
 * Busca appointments de um profissional em um intervalo de datas.
 * Retorna apenas appointments com status "pending" ou "confirmed" (que ocupam agenda).
 */
export async function getAppointmentsByProfessionalAndDateRange(
  professionalId: number,
  establishmentId: number,
  dateFrom: Date,
  dateTo: Date
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.establishmentId, establishmentId),
        eq(appointments.professionalId, professionalId),
        inArray(appointments.status, [...ACTIVE_APPOINTMENT_STATUSES]),
        gte(appointments.startDatetime, dateFrom),
        lte(appointments.startDatetime, dateTo)
      )
    )
    .orderBy(asc(appointments.startDatetime));
}

/**
 * Lista appointments do estabelecimento com filtros opcionais.
 */
export async function getAppointmentsByEstablishment(
  establishmentId: number,
  filters?: {
    professionalId?: number;
    customerId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
  }
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(appointments.establishmentId, establishmentId)];

  if (filters?.professionalId) {
    conditions.push(eq(appointments.professionalId, filters.professionalId));
  }
  if (filters?.customerId) {
    conditions.push(eq(appointments.customerId, filters.customerId));
  }
  if (filters?.dateFrom) {
    conditions.push(gte(appointments.startDatetime, filters.dateFrom));
  }
  if (filters?.dateTo) {
    conditions.push(lte(appointments.startDatetime, filters.dateTo));
  }
  if (filters?.status) {
    conditions.push(eq(appointments.status, filters.status));
  }

  return db
    .select()
    .from(appointments)
    .where(and(...conditions))
    .orderBy(desc(appointments.startDatetime))
    .limit(500);
}

/**
 * Busca um appointment por ID dentro do tenant.
 */
export async function getAppointmentById(
  id: number,
  establishmentId: number
) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.id, id),
        eq(appointments.establishmentId, establishmentId)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Cria um novo appointment.
 */
export async function createAppointment(data: {
  establishmentId: number;
  professionalId: number;
  serviceId: number;
  customerId: number;
  startDatetime: Date;
  endDatetime: Date;
  durationMinutes: number;
  price: string;
  status?: string;
  notes?: string | null;
  source?: string;
  createdBy?: number | null;
  manageToken?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(appointments).values({
    establishmentId: data.establishmentId,
    professionalId: data.professionalId,
    serviceId: data.serviceId,
    customerId: data.customerId,
    startDatetime: data.startDatetime,
    endDatetime: data.endDatetime,
    durationMinutes: data.durationMinutes,
    price: data.price,
    status: data.status ?? "pending",
    notes: data.notes ?? null,
    source: data.source ?? "manual",
    createdBy: data.createdBy ?? null,
    manageToken: data.manageToken ?? null,
  });

  const insertId = result[0].insertId;
  return getAppointmentById(insertId, data.establishmentId);
}

/**
 * Busca um appointment pelo manageToken (para acesso público sem login).
 */
export async function getAppointmentByManageToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(appointments)
    .where(eq(appointments.manageToken, token))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Lista appointments de um customer por telefone normalizado (para acesso público).
 */
export async function getAppointmentsByCustomerPhone(
  establishmentId: number,
  normalizedPhone: string
) {
  const db = await getDb();
  if (!db) return [];

  // Import customers table inline to avoid circular deps
  const { customers } = await import("../drizzle/schema");
  
  // First find the customer
  const customerResult = await db
    .select({ id: customers.id })
    .from(customers)
    .where(
      and(
        eq(customers.establishmentId, establishmentId),
        eq(customers.normalizedPhone, normalizedPhone),
        eq(customers.isActive, true)
      )
    )
    .limit(1);

  if (customerResult.length === 0) return [];

  return db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.establishmentId, establishmentId),
        eq(appointments.customerId, customerResult[0].id),
        inArray(appointments.status, ["pending", "confirmed"])
      )
    )
    .orderBy(asc(appointments.startDatetime));
}

/**
 * Atualiza campos de um appointment.
 */
export async function updateAppointment(
  id: number,
  establishmentId: number,
  data: {
    professionalId?: number;
    serviceId?: number;
    customerId?: number;
    startDatetime?: Date;
    endDatetime?: Date;
    durationMinutes?: number;
    price?: string;
    notes?: string | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (data.professionalId !== undefined) updateData.professionalId = data.professionalId;
  if (data.serviceId !== undefined) updateData.serviceId = data.serviceId;
  if (data.customerId !== undefined) updateData.customerId = data.customerId;
  if (data.startDatetime !== undefined) updateData.startDatetime = data.startDatetime;
  if (data.endDatetime !== undefined) updateData.endDatetime = data.endDatetime;
  if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.notes !== undefined) updateData.notes = data.notes;

  await db
    .update(appointments)
    .set(updateData)
    .where(
      and(
        eq(appointments.id, id),
        eq(appointments.establishmentId, establishmentId)
      )
    );

  return getAppointmentById(id, establishmentId);
}

/**
 * Altera o status de um appointment e registra no histórico.
 */
export async function updateAppointmentStatus(
  id: number,
  establishmentId: number,
  newStatus: string,
  changedBy?: number | null,
  reason?: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current appointment
  const current = await getAppointmentById(id, establishmentId);
  if (!current) return undefined;

  const previousStatus = current.status;

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date(),
  };

  // If cancelling, record cancellation details
  if (newStatus === "cancelled") {
    updateData.cancelledAt = new Date();
    if (reason) updateData.cancellationReason = reason;
  }

  await db
    .update(appointments)
    .set(updateData)
    .where(
      and(
        eq(appointments.id, id),
        eq(appointments.establishmentId, establishmentId)
      )
    );

  // Record status change in history
  await db.insert(appointmentStatusHistory).values({
    appointmentId: id,
    previousStatus,
    newStatus,
    changedBy: changedBy ?? null,
    reason: reason ?? null,
  });

  return getAppointmentById(id, establishmentId);
}

/**
 * Verifica se existe conflito de horário para um profissional.
 * Retorna os appointments conflitantes.
 */
export async function checkAppointmentConflict(
  professionalId: number,
  establishmentId: number,
  startDatetime: Date,
  endDatetime: Date,
  excludeAppointmentId?: number
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(appointments.establishmentId, establishmentId),
    eq(appointments.professionalId, professionalId),
    inArray(appointments.status, [...ACTIVE_APPOINTMENT_STATUSES]),
    // Overlap: existing.start < newEnd AND existing.end > newStart
    sql`${appointments.startDatetime} < ${endDatetime}`,
    sql`${appointments.endDatetime} > ${startDatetime}`,
  ];

  if (excludeAppointmentId) {
    conditions.push(sql`${appointments.id} != ${excludeAppointmentId}`);
  }

  return db
    .select()
    .from(appointments)
    .where(and(...conditions));
}

/**
 * Conta appointments ativos do estabelecimento.
 */
export async function countAppointmentsByEstablishment(
  establishmentId: number,
  filters?: {
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
) {
  const db = await getDb();
  if (!db) return 0;

  const conditions = [eq(appointments.establishmentId, establishmentId)];

  if (filters?.status) {
    conditions.push(eq(appointments.status, filters.status));
  }
  if (filters?.dateFrom) {
    conditions.push(gte(appointments.startDatetime, filters.dateFrom));
  }
  if (filters?.dateTo) {
    conditions.push(lte(appointments.startDatetime, filters.dateTo));
  }

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(appointments)
    .where(and(...conditions));

  return Number(result[0]?.count ?? 0);
}
