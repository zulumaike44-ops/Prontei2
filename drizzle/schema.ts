import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  smallint,
  decimal,
  json,
  datetime,
  uniqueIndex,
  index,
  char,
} from "drizzle-orm/mysql-core";

// ============================================================
// 1. USERS — Usuários da plataforma (independente de tenant)
// ============================================================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  avatarUrl: text("avatarUrl"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================
// 2. BUSINESS_TYPES — Tipos de negócio (tabela de referência)
// ============================================================
export const businessTypes = mysqlTable("business_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  icon: varchar("icon", { length: 50 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_business_types_active").on(table.isActive),
]);

export type BusinessType = typeof businessTypes.$inferSelect;

// ============================================================
// 3. SUBSCRIPTION_PLANS — Planos de assinatura
// ============================================================
export const subscriptionPlans = mysqlTable("subscription_plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  priceMonthly: decimal("priceMonthly", { precision: 10, scale: 2 }).default("0").notNull(),
  priceYearly: decimal("priceYearly", { precision: 10, scale: 2 }),
  maxProfessionals: smallint("maxProfessionals"),
  maxServices: smallint("maxServices"),
  maxAppointmentsMonth: int("maxAppointmentsMonth"),
  features: json("features"),
  isActive: boolean("isActive").default(true).notNull(),
  displayOrder: smallint("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_plans_active").on(table.isActive),
]);

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

// ============================================================
// 4. ESTABLISHMENTS — Estabelecimentos (TENANT PRINCIPAL)
// ============================================================
export const establishments = mysqlTable("establishments", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  businessTypeId: int("businessTypeId").notNull(),
  subscriptionPlanId: int("subscriptionPlanId"),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  description: text("description"),
  logoUrl: text("logoUrl"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  addressZipcode: varchar("addressZipcode", { length: 10 }),
  addressStreet: varchar("addressStreet", { length: 255 }),
  addressNumber: varchar("addressNumber", { length: 20 }),
  addressComplement: varchar("addressComplement", { length: 100 }),
  addressNeighborhood: varchar("addressNeighborhood", { length: 100 }),
  addressCity: varchar("addressCity", { length: 100 }),
  addressState: char("addressState", { length: 2 }),
  timezone: varchar("timezone", { length: 50 }).default("America/Sao_Paulo").notNull(),
  onboardingStep: smallint("onboardingStep").default(1).notNull(),
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_establishments_owner").on(table.ownerId),
  index("idx_establishments_business_type").on(table.businessTypeId),
  index("idx_establishments_active").on(table.isActive),
]);

export type Establishment = typeof establishments.$inferSelect;
export type InsertEstablishment = typeof establishments.$inferInsert;

// ============================================================
// 5. PROFESSIONALS — Profissionais do estabelecimento
// ============================================================
export const professionals = mysqlTable("professionals", {
  id: int("id").autoincrement().primaryKey(),
  establishmentId: int("establishmentId").notNull(),
  userId: int("userId"),
  name: varchar("name", { length: 150 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  avatarUrl: text("avatarUrl"),
  bio: text("bio"),
  isActive: boolean("isActive").default(true).notNull(),
  displayOrder: smallint("displayOrder").default(0).notNull(),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_professionals_establishment").on(table.establishmentId),
  index("idx_professionals_active").on(table.establishmentId, table.isActive),
  uniqueIndex("uq_professionals_email").on(table.establishmentId, table.email),
]);

export type Professional = typeof professionals.$inferSelect;
export type InsertProfessional = typeof professionals.$inferInsert;

// ============================================================
// 6. SERVICES — Serviços oferecidos pelo estabelecimento
// ============================================================
export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  establishmentId: int("establishmentId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  durationMinutes: smallint("durationMinutes").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).default("0").notNull(),
  category: varchar("category", { length: 100 }),
  isActive: boolean("isActive").default(true).notNull(),
  displayOrder: smallint("displayOrder").default(0).notNull(),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_services_establishment").on(table.establishmentId),
  index("idx_services_active").on(table.establishmentId, table.isActive),
  index("idx_services_category").on(table.establishmentId, table.category),
]);

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

// ============================================================
// 7. PROFESSIONAL_SERVICES — Junção N:N
// ============================================================
export const professionalServices = mysqlTable("professional_services", {
  id: int("id").autoincrement().primaryKey(),
  professionalId: int("professionalId").notNull(),
  serviceId: int("serviceId").notNull(),
  customPrice: decimal("customPrice", { precision: 10, scale: 2 }),
  customDurationMinutes: smallint("customDurationMinutes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_prof_service").on(table.professionalId, table.serviceId),
  index("idx_prof_services_prof").on(table.professionalId),
  index("idx_prof_services_service").on(table.serviceId),
]);

// ============================================================
// 8. WORKING_HOURS — Horários regulares de funcionamento
// ============================================================
export const workingHours = mysqlTable("working_hours", {
  id: int("id").autoincrement().primaryKey(),
  establishmentId: int("establishmentId").notNull(),
  professionalId: int("professionalId"),
  dayOfWeek: smallint("dayOfWeek").notNull(), // 0=dom, 6=sab
  startTime: varchar("startTime", { length: 5 }).notNull(), // "08:00"
  endTime: varchar("endTime", { length: 5 }).notNull(), // "18:00"
  breakStart: varchar("breakStart", { length: 5 }),
  breakEnd: varchar("breakEnd", { length: 5 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("uq_working_hours").on(table.establishmentId, table.professionalId, table.dayOfWeek),
  index("idx_working_hours_establishment").on(table.establishmentId),
]);

// ============================================================
// 9. BLOCKED_TIMES — Bloqueios pontuais de horário
// ============================================================
export const blockedTimes = mysqlTable("blocked_times", {
  id: int("id").autoincrement().primaryKey(),
  establishmentId: int("establishmentId").notNull(),
  professionalId: int("professionalId"),
  title: varchar("title", { length: 200 }).notNull(),
  reason: varchar("reason", { length: 255 }),
  startDatetime: datetime("startDatetime").notNull(),
  endDatetime: datetime("endDatetime").notNull(),
  isAllDay: boolean("isAllDay").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_blocked_establishment").on(table.establishmentId),
  index("idx_blocked_prof").on(table.establishmentId, table.professionalId),
  index("idx_blocked_range").on(table.startDatetime, table.endDatetime),
]);

// ============================================================
// 10. CUSTOMERS — Clientes do estabelecimento
// ============================================================
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  establishmentId: int("establishmentId").notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("uq_customer_phone").on(table.establishmentId, table.phone),
  index("idx_customers_establishment").on(table.establishmentId),
  index("idx_customers_name").on(table.establishmentId, table.name),
]);

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ============================================================
// 11. APPOINTMENTS — Agendamentos
// ============================================================
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  establishmentId: int("establishmentId").notNull(),
  professionalId: int("professionalId").notNull(),
  serviceId: int("serviceId").notNull(),
  customerId: int("customerId"),
  startDatetime: datetime("startDatetime").notNull(),
  endDatetime: datetime("endDatetime").notNull(),
  durationMinutes: smallint("durationMinutes").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  source: varchar("source", { length: 20 }).default("manual").notNull(),
  cancelledAt: datetime("cancelledAt"),
  cancellationReason: varchar("cancellationReason", { length: 255 }),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_appt_establishment").on(table.establishmentId),
  index("idx_appt_prof_range").on(table.establishmentId, table.professionalId, table.startDatetime, table.endDatetime),
  index("idx_appt_start").on(table.establishmentId, table.startDatetime),
  index("idx_appt_customer").on(table.establishmentId, table.customerId),
  index("idx_appt_status").on(table.establishmentId, table.status),
]);

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// ============================================================
// 12. APPOINTMENT_STATUS_HISTORY — Histórico de status
// ============================================================
export const appointmentStatusHistory = mysqlTable("appointment_status_history", {
  id: int("id").autoincrement().primaryKey(),
  appointmentId: int("appointmentId").notNull(),
  previousStatus: varchar("previousStatus", { length: 20 }),
  newStatus: varchar("newStatus", { length: 20 }).notNull(),
  changedBy: int("changedBy"),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_status_history_appt").on(table.appointmentId),
]);

// ============================================================
// 13. AUDIT_LOGS — Registro de auditoria (append-only)
// ============================================================
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  establishmentId: int("establishmentId"),
  userId: int("userId"),
  action: varchar("action", { length: 50 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId"),
  oldValues: json("oldValues"),
  newValues: json("newValues"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_establishment").on(table.establishmentId),
  index("idx_audit_entity").on(table.entityType, table.entityId),
  index("idx_audit_created").on(table.createdAt),
]);
