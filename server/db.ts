import { eq, and, isNull, asc, desc, sql, gte, lte, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  establishments,
  businessTypes,
  subscriptionPlans,
  professionals,
  services,
  professionalServices,
  workingHours,
  blockedTimes,
  customers,
  appointments,
  appointmentStatusHistory,
  type InsertEstablishment,
  type InsertProfessional,
  type InsertService,
  type InsertCustomer,
  type InsertAppointment,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================
// USER QUERIES
// ============================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================
// BUSINESS TYPES QUERIES
// ============================================================

export async function getActiveBusinessTypes() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(businessTypes)
    .where(eq(businessTypes.isActive, true))
    .orderBy(businessTypes.name);
}

// ============================================================
// SUBSCRIPTION PLANS QUERIES
// ============================================================

export async function getActiveSubscriptionPlans() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.isActive, true))
    .orderBy(subscriptionPlans.displayOrder);
}

// ============================================================
// ESTABLISHMENT QUERIES
// ============================================================

export async function getEstablishmentByOwnerId(ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(establishments)
    .where(
      and(
        eq(establishments.ownerId, ownerId),
        isNull(establishments.deletedAt)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getEstablishmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(establishments)
    .where(
      and(
        eq(establishments.id, id),
        isNull(establishments.deletedAt)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createEstablishment(data: InsertEstablishment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(establishments).values(data);
  const insertId = result[0].insertId;

  return getEstablishmentById(insertId);
}

export async function updateEstablishment(
  id: number,
  ownerId: number,
  data: Partial<Omit<InsertEstablishment, "id" | "ownerId" | "createdAt">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(establishments)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(establishments.id, id),
        eq(establishments.ownerId, ownerId),
        isNull(establishments.deletedAt)
      )
    );

  return getEstablishmentById(id);
}

export async function advanceOnboardingStep(
  id: number,
  ownerId: number,
  step: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const isCompleted = step > 6;

  await db
    .update(establishments)
    .set({
      onboardingStep: isCompleted ? 6 : step,
      onboardingCompleted: isCompleted,
      updatedAt: new Date(),
    })
    .where(
      and(eq(establishments.id, id), eq(establishments.ownerId, ownerId))
    );

  return getEstablishmentById(id);
}

export async function generateUniqueSlug(name: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180);

  const existing = await db
    .select({ slug: establishments.slug })
    .from(establishments)
    .where(eq(establishments.slug, base))
    .limit(1);

  if (existing.length === 0) return base;

  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

// ============================================================
// PROFESSIONAL QUERIES
// ============================================================

export async function getProfessionalsByEstablishment(establishmentId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(professionals)
    .where(
      and(
        eq(professionals.establishmentId, establishmentId),
        isNull(professionals.deletedAt)
      )
    )
    .orderBy(asc(professionals.displayOrder), asc(professionals.name));
}

export async function getProfessionalById(id: number, establishmentId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(professionals)
    .where(
      and(
        eq(professionals.id, id),
        eq(professionals.establishmentId, establishmentId),
        isNull(professionals.deletedAt)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createProfessional(data: InsertProfessional) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(professionals).values(data);
  const insertId = result[0].insertId;

  return getProfessionalById(insertId, data.establishmentId);
}

export async function updateProfessional(
  id: number,
  establishmentId: number,
  data: Partial<Omit<InsertProfessional, "id" | "establishmentId" | "createdAt">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(professionals)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(professionals.id, id),
        eq(professionals.establishmentId, establishmentId),
        isNull(professionals.deletedAt)
      )
    );

  return getProfessionalById(id, establishmentId);
}

export async function softDeleteProfessional(id: number, establishmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(professionals)
    .set({
      deletedAt: new Date(),
      isActive: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(professionals.id, id),
        eq(professionals.establishmentId, establishmentId),
        isNull(professionals.deletedAt)
      )
    );

  return { success: true };
}

export async function countProfessionalsByEstablishment(establishmentId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(professionals)
    .where(
      and(
        eq(professionals.establishmentId, establishmentId),
        isNull(professionals.deletedAt)
      )
    );

  return Number(result[0]?.count ?? 0);
}

// ============================================================
// SERVICE QUERIES
// ============================================================

export async function getServicesByEstablishment(establishmentId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(services)
    .where(
      and(
        eq(services.establishmentId, establishmentId),
        isNull(services.deletedAt)
      )
    )
    .orderBy(asc(services.displayOrder), asc(services.name));
}

export async function getServiceById(id: number, establishmentId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(services)
    .where(
      and(
        eq(services.id, id),
        eq(services.establishmentId, establishmentId),
        isNull(services.deletedAt)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createService(data: InsertService) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(services).values(data);
  const insertId = result[0].insertId;

  return getServiceById(insertId, data.establishmentId);
}

export async function updateService(
  id: number,
  establishmentId: number,
  data: Partial<Omit<InsertService, "id" | "establishmentId" | "createdAt">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(services)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(services.id, id),
        eq(services.establishmentId, establishmentId),
        isNull(services.deletedAt)
      )
    );

  return getServiceById(id, establishmentId);
}

export async function softDeleteService(id: number, establishmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(services)
    .set({
      deletedAt: new Date(),
      isActive: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(services.id, id),
        eq(services.establishmentId, establishmentId),
        isNull(services.deletedAt)
      )
    );

  return { success: true };
}

export async function countServicesByEstablishment(establishmentId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(services)
    .where(
      and(
        eq(services.establishmentId, establishmentId),
        isNull(services.deletedAt)
      )
    );

  return Number(result[0]?.count ?? 0);
}

// ============================================================
// PROFESSIONAL_SERVICES QUERIES (N:N link)
// ============================================================

export async function getProfessionalServiceLinks(
  professionalId: number,
  establishmentId: number
) {
  const db = await getDb();
  if (!db) return [];

  // Join to get service details along with custom overrides
  const result = await db
    .select({
      linkId: professionalServices.id,
      professionalId: professionalServices.professionalId,
      serviceId: professionalServices.serviceId,
      customPrice: professionalServices.customPrice,
      customDurationMinutes: professionalServices.customDurationMinutes,
      isActive: professionalServices.isActive,
      serviceName: services.name,
      servicePrice: services.price,
      serviceDurationMinutes: services.durationMinutes,
      serviceIsActive: services.isActive,
    })
    .from(professionalServices)
    .innerJoin(services, eq(professionalServices.serviceId, services.id))
    .where(
      and(
        eq(professionalServices.professionalId, professionalId),
        eq(services.establishmentId, establishmentId),
        isNull(services.deletedAt)
      )
    )
    .orderBy(asc(services.name));

  return result;
}

export async function getServiceProfessionalLinks(
  serviceId: number,
  establishmentId: number
) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      linkId: professionalServices.id,
      professionalId: professionalServices.professionalId,
      serviceId: professionalServices.serviceId,
      customPrice: professionalServices.customPrice,
      customDurationMinutes: professionalServices.customDurationMinutes,
      isActive: professionalServices.isActive,
      professionalName: professionals.name,
      professionalIsActive: professionals.isActive,
    })
    .from(professionalServices)
    .innerJoin(
      professionals,
      eq(professionalServices.professionalId, professionals.id)
    )
    .where(
      and(
        eq(professionalServices.serviceId, serviceId),
        eq(professionals.establishmentId, establishmentId),
        isNull(professionals.deletedAt)
      )
    )
    .orderBy(asc(professionals.name));

  return result;
}

export async function upsertProfessionalService(data: {
  professionalId: number;
  serviceId: number;
  customPrice?: string | null;
  customDurationMinutes?: number | null;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Use INSERT ... ON DUPLICATE KEY UPDATE for upsert
  await db
    .insert(professionalServices)
    .values({
      professionalId: data.professionalId,
      serviceId: data.serviceId,
      customPrice: data.customPrice ?? null,
      customDurationMinutes: data.customDurationMinutes ?? null,
      isActive: data.isActive ?? true,
    })
    .onDuplicateKeyUpdate({
      set: {
        customPrice: data.customPrice ?? null,
        customDurationMinutes: data.customDurationMinutes ?? null,
        isActive: data.isActive ?? true,
      },
    });

  return { success: true };
}

export async function removeProfessionalService(
  professionalId: number,
  serviceId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(professionalServices)
    .where(
      and(
        eq(professionalServices.professionalId, professionalId),
        eq(professionalServices.serviceId, serviceId)
      )
    );

  return { success: true };
}

// ============================================================
// WORKING_HOURS QUERIES
// ============================================================

export async function getWorkingHoursByProfessional(
  professionalId: number,
  establishmentId: number
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(workingHours)
    .where(
      and(
        eq(workingHours.professionalId, professionalId),
        eq(workingHours.establishmentId, establishmentId)
      )
    )
    .orderBy(asc(workingHours.dayOfWeek));
}

export async function saveWeeklySchedule(
  professionalId: number,
  establishmentId: number,
  schedule: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    breakStart: string | null;
    breakEnd: string | null;
    isActive: boolean;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete existing schedule for this professional in this establishment
  await db
    .delete(workingHours)
    .where(
      and(
        eq(workingHours.professionalId, professionalId),
        eq(workingHours.establishmentId, establishmentId)
      )
    );

  // Insert new schedule (only active days or all days for completeness)
  if (schedule.length > 0) {
    const rows = schedule.map((day) => ({
      establishmentId,
      professionalId,
      dayOfWeek: day.dayOfWeek,
      startTime: day.startTime,
      endTime: day.endTime,
      breakStart: day.breakStart,
      breakEnd: day.breakEnd,
      isActive: day.isActive,
    }));

    await db.insert(workingHours).values(rows);
  }

  // Return the saved schedule
  return getWorkingHoursByProfessional(professionalId, establishmentId);
}

// ============================================================
// BLOCKED_TIMES QUERIES
// ============================================================

export async function getBlockedTimesByEstablishment(
  establishmentId: number,
  filters?: {
    professionalId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    activeOnly?: boolean;
  }
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(blockedTimes.establishmentId, establishmentId)];

  if (filters?.professionalId !== undefined) {
    conditions.push(eq(blockedTimes.professionalId, filters.professionalId));
  }

  if (filters?.dateFrom) {
    conditions.push(gte(blockedTimes.endDatetime, filters.dateFrom));
  }

  if (filters?.dateTo) {
    conditions.push(lte(blockedTimes.startDatetime, filters.dateTo));
  }

  if (filters?.activeOnly) {
    conditions.push(eq(blockedTimes.isActive, true));
  }

  return db
    .select()
    .from(blockedTimes)
    .where(and(...conditions))
    .orderBy(desc(blockedTimes.startDatetime));
}

export async function getBlockedTimeById(id: number, establishmentId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(blockedTimes)
    .where(
      and(
        eq(blockedTimes.id, id),
        eq(blockedTimes.establishmentId, establishmentId)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createBlockedTime(data: {
  establishmentId: number;
  professionalId?: number | null;
  title: string;
  reason?: string | null;
  startDatetime: Date;
  endDatetime: Date;
  isAllDay: boolean;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(blockedTimes).values({
    establishmentId: data.establishmentId,
    professionalId: data.professionalId ?? null,
    title: data.title,
    reason: data.reason ?? null,
    startDatetime: data.startDatetime,
    endDatetime: data.endDatetime,
    isAllDay: data.isAllDay,
    isActive: data.isActive ?? true,
  });

  const insertId = result[0].insertId;
  return getBlockedTimeById(insertId, data.establishmentId);
}

export async function updateBlockedTime(
  id: number,
  establishmentId: number,
  data: {
    professionalId?: number | null;
    title?: string;
    reason?: string | null;
    startDatetime?: Date;
    endDatetime?: Date;
    isAllDay?: boolean;
    isActive?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (data.professionalId !== undefined) updateData.professionalId = data.professionalId;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.reason !== undefined) updateData.reason = data.reason;
  if (data.startDatetime !== undefined) updateData.startDatetime = data.startDatetime;
  if (data.endDatetime !== undefined) updateData.endDatetime = data.endDatetime;
  if (data.isAllDay !== undefined) updateData.isAllDay = data.isAllDay;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  await db
    .update(blockedTimes)
    .set(updateData)
    .where(
      and(
        eq(blockedTimes.id, id),
        eq(blockedTimes.establishmentId, establishmentId)
      )
    );

  return getBlockedTimeById(id, establishmentId);
}

export async function softDeleteBlockedTime(id: number, establishmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(blockedTimes)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(blockedTimes.id, id),
        eq(blockedTimes.establishmentId, establishmentId)
      )
    );

  return { success: true };
}

export async function countBlockedTimesByEstablishment(establishmentId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(blockedTimes)
    .where(
      and(
        eq(blockedTimes.establishmentId, establishmentId),
        eq(blockedTimes.isActive, true)
      )
    );

  return Number(result[0]?.count ?? 0);
}

// ============================================================
// CUSTOMER QUERIES
// ============================================================

/**
 * Normaliza telefone: remove tudo exceto dígitos.
 * Ex: "(11) 99999-1234" → "11999991234"
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function getCustomersByEstablishment(
  establishmentId: number,
  filters?: {
    search?: string;
    activeOnly?: boolean;
  }
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(customers.establishmentId, establishmentId)];

  if (filters?.activeOnly) {
    conditions.push(eq(customers.isActive, true));
  }

  if (filters?.search && filters.search.trim().length > 0) {
    const term = `%${filters.search.trim()}%`;
    const normalizedTerm = `%${normalizePhone(filters.search.trim())}%`;
    // Search by name OR phone (original or normalized)
    conditions.push(
      or(
        like(customers.name, term),
        like(customers.phone, term),
        like(customers.normalizedPhone, normalizedTerm)
      )!
    );
  }

  return db
    .select()
    .from(customers)
    .where(and(...conditions))
    .orderBy(asc(customers.name))
    .limit(200);
}

export async function getCustomerById(id: number, establishmentId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.id, id),
        eq(customers.establishmentId, establishmentId)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getCustomerByNormalizedPhone(
  normalizedPhone: string,
  establishmentId: number
) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.normalizedPhone, normalizedPhone),
        eq(customers.establishmentId, establishmentId)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createCustomer(data: {
  establishmentId: number;
  name: string;
  phone: string;
  normalizedPhone: string;
  email?: string | null;
  notes?: string | null;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(customers).values({
    establishmentId: data.establishmentId,
    name: data.name,
    phone: data.phone,
    normalizedPhone: data.normalizedPhone,
    email: data.email ?? null,
    notes: data.notes ?? null,
    isActive: data.isActive ?? true,
  });

  const insertId = result[0].insertId;
  return getCustomerById(insertId, data.establishmentId);
}

export async function updateCustomer(
  id: number,
  establishmentId: number,
  data: {
    name?: string;
    phone?: string;
    normalizedPhone?: string;
    email?: string | null;
    notes?: string | null;
    isActive?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.normalizedPhone !== undefined) updateData.normalizedPhone = data.normalizedPhone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  await db
    .update(customers)
    .set(updateData)
    .where(
      and(
        eq(customers.id, id),
        eq(customers.establishmentId, establishmentId)
      )
    );

  return getCustomerById(id, establishmentId);
}

export async function deactivateCustomer(id: number, establishmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(customers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(customers.id, id),
        eq(customers.establishmentId, establishmentId)
      )
    );

  return { success: true };
}

export async function countCustomersByEstablishment(establishmentId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(
      and(
        eq(customers.establishmentId, establishmentId),
        eq(customers.isActive, true)
      )
    );

  return Number(result[0]?.count ?? 0);
}
