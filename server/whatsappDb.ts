/**
 * WHATSAPP DB QUERIES — Queries de banco para módulo WhatsApp
 * Atualizado para Z-API (instanceId, instanceToken, clientToken)
 */

import { eq, and, desc, asc, sql } from "drizzle-orm";
import {
  whatsappSettings,
  whatsappConversations,
  whatsappMessages,
  customers,
  type InsertWhatsappSettings,
  type InsertWhatsappConversation,
  type InsertWhatsappMessage,
} from "../drizzle/schema";
import { getDb } from "./db";

// ============================================================
// WHATSAPP SETTINGS
// ============================================================

export async function getWhatsappSettings(establishmentId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(whatsappSettings)
    .where(eq(whatsappSettings.establishmentId, establishmentId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function upsertWhatsappSettings(data: {
  establishmentId: number;
  isEnabled?: boolean;
  phoneNumber?: string | null;
  provider?: string;
  // Z-API fields
  instanceId?: string | null;
  instanceToken?: string | null;
  clientToken?: string | null;
  // Legacy Meta fields (kept for migration)
  accessToken?: string | null;
  webhookVerifyToken?: string | null;
  phoneNumberId?: string | null;
  businessAccountId?: string | null;
  autoReplyEnabled?: boolean;
  autoReplyMessage?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getWhatsappSettings(data.establishmentId);

  if (existing) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
    if (data.provider !== undefined) updateData.provider = data.provider;
    // Z-API fields
    if (data.instanceId !== undefined) updateData.instanceId = data.instanceId;
    if (data.instanceToken !== undefined) updateData.instanceToken = data.instanceToken;
    if (data.clientToken !== undefined) updateData.clientToken = data.clientToken;
    // Legacy Meta fields
    if (data.accessToken !== undefined) updateData.accessToken = data.accessToken;
    if (data.webhookVerifyToken !== undefined) updateData.webhookVerifyToken = data.webhookVerifyToken;
    if (data.phoneNumberId !== undefined) updateData.phoneNumberId = data.phoneNumberId;
    if (data.businessAccountId !== undefined) updateData.businessAccountId = data.businessAccountId;
    if (data.autoReplyEnabled !== undefined) updateData.autoReplyEnabled = data.autoReplyEnabled;
    if (data.autoReplyMessage !== undefined) updateData.autoReplyMessage = data.autoReplyMessage;

    await db
      .update(whatsappSettings)
      .set(updateData)
      .where(eq(whatsappSettings.id, existing.id));

    return getWhatsappSettings(data.establishmentId);
  } else {
    await db.insert(whatsappSettings).values({
      establishmentId: data.establishmentId,
      isEnabled: data.isEnabled ?? false,
      phoneNumber: data.phoneNumber ?? null,
      provider: data.provider ?? "z-api",
      instanceId: data.instanceId ?? null,
      instanceToken: data.instanceToken ?? null,
      clientToken: data.clientToken ?? null,
      accessToken: data.accessToken ?? null,
      webhookVerifyToken: data.webhookVerifyToken ?? null,
      phoneNumberId: data.phoneNumberId ?? null,
      businessAccountId: data.businessAccountId ?? null,
      autoReplyEnabled: data.autoReplyEnabled ?? true,
      autoReplyMessage: data.autoReplyMessage ?? null,
    });

    return getWhatsappSettings(data.establishmentId);
  }
}

/**
 * Encontra o establishment pelo instanceId da Z-API.
 * Usado pelo webhook para resolver tenant sem autenticação de usuário.
 */
export async function getSettingsByInstanceId(instanceId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(whatsappSettings)
    .where(eq(whatsappSettings.instanceId, instanceId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Encontra o establishment pelo phoneNumber configurado no WhatsApp.
 * Fallback para resolver tenant.
 */
export async function getSettingsByPhoneNumber(phoneNumber: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(whatsappSettings)
    .where(eq(whatsappSettings.phoneNumber, phoneNumber))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================
// WHATSAPP CONVERSATIONS
// ============================================================

export async function getConversationsByEstablishment(
  establishmentId: number,
  filters?: {
    status?: string;
    limit?: number;
  }
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(whatsappConversations.establishmentId, establishmentId)];

  if (filters?.status) {
    conditions.push(eq(whatsappConversations.status, filters.status));
  }

  return db
    .select({
      id: whatsappConversations.id,
      establishmentId: whatsappConversations.establishmentId,
      customerId: whatsappConversations.customerId,
      phone: whatsappConversations.phone,
      normalizedPhone: whatsappConversations.normalizedPhone,
      status: whatsappConversations.status,
      lastMessageAt: whatsappConversations.lastMessageAt,
      lastMessagePreview: whatsappConversations.lastMessagePreview,
      messageCount: whatsappConversations.messageCount,
      createdAt: whatsappConversations.createdAt,
      updatedAt: whatsappConversations.updatedAt,
      // Join customer name
      customerName: customers.name,
    })
    .from(whatsappConversations)
    .leftJoin(customers, eq(whatsappConversations.customerId, customers.id))
    .where(and(...conditions))
    .orderBy(desc(whatsappConversations.lastMessageAt))
    .limit(filters?.limit ?? 100);
}

export async function getConversationById(id: number, establishmentId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select({
      id: whatsappConversations.id,
      establishmentId: whatsappConversations.establishmentId,
      customerId: whatsappConversations.customerId,
      phone: whatsappConversations.phone,
      normalizedPhone: whatsappConversations.normalizedPhone,
      status: whatsappConversations.status,
      lastMessageAt: whatsappConversations.lastMessageAt,
      lastMessagePreview: whatsappConversations.lastMessagePreview,
      messageCount: whatsappConversations.messageCount,
      createdAt: whatsappConversations.createdAt,
      updatedAt: whatsappConversations.updatedAt,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(whatsappConversations)
    .leftJoin(customers, eq(whatsappConversations.customerId, customers.id))
    .where(
      and(
        eq(whatsappConversations.id, id),
        eq(whatsappConversations.establishmentId, establishmentId)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Encontra ou cria uma conversa para um telefone dentro do establishment.
 * Se já existe conversa aberta, retorna ela. Se não, cria nova.
 */
export async function findOrCreateConversation(
  establishmentId: number,
  phone: string,
  normalizedPhone: string,
  customerId?: number | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Procura conversa aberta existente para este telefone
  const existing = await db
    .select()
    .from(whatsappConversations)
    .where(
      and(
        eq(whatsappConversations.establishmentId, establishmentId),
        eq(whatsappConversations.normalizedPhone, normalizedPhone),
        eq(whatsappConversations.status, "open")
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const conv = existing[0];
    // Atualiza customerId se agora temos e antes não tínhamos
    if (customerId && !conv.customerId) {
      await db
        .update(whatsappConversations)
        .set({ customerId, updatedAt: new Date() })
        .where(eq(whatsappConversations.id, conv.id));
    }
    return { ...conv, customerId: customerId ?? conv.customerId, isNew: false };
  }

  // Cria nova conversa
  const result = await db.insert(whatsappConversations).values({
    establishmentId,
    customerId: customerId ?? null,
    phone,
    normalizedPhone,
    status: "open",
    lastMessageAt: new Date(),
    messageCount: 0,
  });

  const insertId = result[0].insertId;
  const newConv = await db
    .select()
    .from(whatsappConversations)
    .where(eq(whatsappConversations.id, insertId))
    .limit(1);

  return { ...newConv[0], isNew: true };
}

export async function updateConversationLastMessage(
  conversationId: number,
  preview: string
) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(whatsappConversations)
    .set({
      lastMessageAt: new Date(),
      lastMessagePreview: preview.slice(0, 255),
      messageCount: sql`${whatsappConversations.messageCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(whatsappConversations.id, conversationId));
}

export async function closeConversation(id: number, establishmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(whatsappConversations)
    .set({ status: "closed", updatedAt: new Date() })
    .where(
      and(
        eq(whatsappConversations.id, id),
        eq(whatsappConversations.establishmentId, establishmentId)
      )
    );

  return { success: true };
}

// ============================================================
// WHATSAPP MESSAGES
// ============================================================

export async function getMessagesByConversation(
  conversationId: number,
  limit: number = 100
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(whatsappMessages)
    .where(eq(whatsappMessages.conversationId, conversationId))
    .orderBy(asc(whatsappMessages.createdAt))
    .limit(limit);
}

export async function createMessage(data: {
  conversationId: number;
  direction: string;
  messageType?: string;
  content: string | null;
  externalMessageId?: string | null;
  status?: string;
  metadata?: unknown;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(whatsappMessages).values({
    conversationId: data.conversationId,
    direction: data.direction,
    messageType: data.messageType ?? "text",
    content: data.content,
    externalMessageId: data.externalMessageId ?? null,
    status: data.status ?? (data.direction === "inbound" ? "received" : "sent"),
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
  });

  const insertId = result[0].insertId;

  // Update conversation's last message
  await updateConversationLastMessage(
    data.conversationId,
    data.content ?? "[mídia]"
  );

  const msg = await db
    .select()
    .from(whatsappMessages)
    .where(eq(whatsappMessages.id, insertId))
    .limit(1);

  return msg[0];
}

// ============================================================
// CHATBOT STATE MANAGEMENT
// ============================================================

const CONVERSATION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

export type ConversationState =
  | "MENU"
  | "SERVICE_SELECTION"
  | "PROFESSIONAL_SELECTION"
  | "DATE_SELECTION"
  | "TIME_SELECTION"
  | "CONFIRMATION"
  | "COMPLETED";

/**
 * Busca conversa aberta com estado do chatbot.
 * Se a conversa expirou (30 min sem interação), reseta o estado para MENU.
 */
export async function getConversationWithState(
  establishmentId: number,
  normalizedPhone: string
): Promise<(typeof whatsappConversations.$inferSelect & { isNew: boolean }) | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(whatsappConversations)
    .where(
      and(
        eq(whatsappConversations.establishmentId, establishmentId),
        eq(whatsappConversations.normalizedPhone, normalizedPhone),
        eq(whatsappConversations.status, "open")
      )
    )
    .limit(1);

  if (result.length === 0) return null;

  const conv = result[0];

  // Check timeout: if last interaction > 30 min ago, reset state
  if (conv.lastInteractionAt) {
    const elapsed = Date.now() - new Date(conv.lastInteractionAt).getTime();
    if (elapsed > CONVERSATION_TIMEOUT_MS && conv.conversationState !== "MENU") {
      await resetConversationState(conv.id);
      return { ...conv, conversationState: "MENU", selectedServiceId: null, selectedProfessionalId: null, selectedDate: null, selectedTime: null, isNew: false };
    }
  }

  return { ...conv, isNew: false };
}

/**
 * Atualiza o estado da conversa do chatbot.
 */
export async function updateConversationState(
  conversationId: number,
  state: ConversationState,
  selections?: {
    selectedServiceId?: number | null;
    selectedProfessionalId?: number | null;
    selectedDate?: string | null;
    selectedTime?: string | null;
  }
) {
  const db = await getDb();
  if (!db) return;

  const updateData: Record<string, unknown> = {
    conversationState: state,
    lastInteractionAt: new Date(),
    updatedAt: new Date(),
  };

  if (selections?.selectedServiceId !== undefined) updateData.selectedServiceId = selections.selectedServiceId;
  if (selections?.selectedProfessionalId !== undefined) updateData.selectedProfessionalId = selections.selectedProfessionalId;
  if (selections?.selectedDate !== undefined) updateData.selectedDate = selections.selectedDate;
  if (selections?.selectedTime !== undefined) updateData.selectedTime = selections.selectedTime;

  await db
    .update(whatsappConversations)
    .set(updateData)
    .where(eq(whatsappConversations.id, conversationId));
}

/**
 * Reseta o estado da conversa para MENU e limpa seleções.
 */
export async function resetConversationState(conversationId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(whatsappConversations)
    .set({
      conversationState: "MENU",
      selectedServiceId: null,
      selectedProfessionalId: null,
      selectedDate: null,
      selectedTime: null,
      lastInteractionAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(whatsappConversations.id, conversationId));
}

/**
 * Atualiza lastInteractionAt para manter a conversa ativa.
 */
export async function touchConversation(conversationId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(whatsappConversations)
    .set({
      lastInteractionAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(whatsappConversations.id, conversationId));
}

export async function countConversationsByEstablishment(establishmentId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(whatsappConversations)
    .where(eq(whatsappConversations.establishmentId, establishmentId));

  return Number(result[0]?.count ?? 0);
}
