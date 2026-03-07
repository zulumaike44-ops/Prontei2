import { eq, and, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  establishments,
  businessTypes,
  subscriptionPlans,
  type InsertEstablishment,
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
