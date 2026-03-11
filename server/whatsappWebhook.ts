/**
 * WHATSAPP WEBHOOK — Handler para recebimento de mensagens (Etapa 19)
 *
 * Estratégia de identificação do tenant no webhook:
 * O webhook recebe payload do provider (Meta Cloud API) que inclui o phone_number_id
 * do número de destino. Usamos esse ID para localizar o whatsapp_settings e,
 * consequentemente, o establishment_id.
 *
 * Fluxo:
 * 1. Recebe payload → extrai phone_number_id do destino
 * 2. Localiza whatsapp_settings pelo phoneNumberId → resolve establishment
 * 3. Normaliza telefone do remetente
 * 4. Localiza ou cria customer pelo telefone normalizado (opção B)
 * 5. Encontra ou cria conversation
 * 6. Registra mensagem inbound
 * 7. Se autoReply habilitado e conversa nova → envia resposta automática (stub)
 *
 * O que está REAL:
 * - Recebimento e parsing do payload Meta Cloud API
 * - Persistência de conversas e mensagens
 * - Vínculo com customer
 * - Resposta automática (registro outbound)
 *
 * O que está MOCKADO:
 * - Envio real da mensagem ao WhatsApp (sendWhatsappMessage é um stub)
 * - Validação de assinatura do webhook (HMAC)
 */

import type { Request, Response } from "express";
import {
  getSettingsByPhoneNumber,
  findOrCreateConversation,
  createMessage,
  getWhatsappSettings,
} from "./whatsappDb";
import {
  getCustomerByNormalizedPhone,
  createCustomer,
  normalizePhone,
  getEstablishmentById,
} from "./db";

// ============================================================
// STUB: Envio de mensagem ao WhatsApp
// ============================================================

/**
 * STUB — Simula envio de mensagem ao WhatsApp.
 * Em produção, isso chamaria a API do Meta Cloud / Z-API / Evolution.
 * Por ora, apenas loga e retorna um ID fictício.
 */
export async function sendWhatsappMessage(
  _phoneNumberId: string,
  _accessToken: string,
  recipientPhone: string,
  messageText: string
): Promise<{ success: boolean; messageId: string }> {
  const fakeId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  console.log(`[WhatsApp STUB] Enviando para ${recipientPhone}: "${messageText.slice(0, 80)}..."`);
  console.log(`[WhatsApp STUB] Message ID: ${fakeId}`);

  // Em produção, aqui seria:
  // const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
  //   method: "POST",
  //   headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     messaging_product: "whatsapp",
  //     to: recipientPhone,
  //     type: "text",
  //     text: { body: messageText },
  //   }),
  // });

  return { success: true, messageId: fakeId };
}

// ============================================================
// WEBHOOK VERIFICATION (GET)
// ============================================================

/**
 * Handler para verificação do webhook pelo Meta Cloud API.
 * Meta envia GET com hub.mode, hub.verify_token e hub.challenge.
 */
export function handleWebhookVerification(req: Request, res: Response) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token && challenge) {
    // Em produção, validar token contra whatsapp_settings.webhookVerifyToken
    // Por ora, aceitar qualquer token para facilitar testes
    console.log("[WhatsApp Webhook] Verificação recebida, challenge aceito");
    res.status(200).send(challenge);
  } else {
    console.warn("[WhatsApp Webhook] Verificação falhou — parâmetros inválidos");
    res.status(403).send("Forbidden");
  }
}

// ============================================================
// WEBHOOK MESSAGE HANDLER (POST)
// ============================================================

/**
 * Handler principal para recebimento de mensagens do Meta Cloud API.
 *
 * Payload esperado (Meta Cloud API):
 * {
 *   object: "whatsapp_business_account",
 *   entry: [{
 *     id: "WABA_ID",
 *     changes: [{
 *       value: {
 *         messaging_product: "whatsapp",
 *         metadata: { display_phone_number: "...", phone_number_id: "..." },
 *         contacts: [{ profile: { name: "..." }, wa_id: "..." }],
 *         messages: [{ id: "...", from: "...", timestamp: "...", type: "text", text: { body: "..." } }]
 *       },
 *       field: "messages"
 *     }]
 *   }]
 * }
 */
export async function handleWebhookMessage(req: Request, res: Response) {
  // Responder 200 imediatamente (Meta exige resposta rápida)
  res.status(200).json({ status: "received" });

  try {
    const body = req.body;

    // Validar estrutura básica
    if (body?.object !== "whatsapp_business_account") {
      console.warn("[WhatsApp Webhook] Payload inválido — object não é whatsapp_business_account");
      return;
    }

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== "messages") continue;

        const value = change.value;
        if (!value) continue;

        const phoneNumberId = value.metadata?.phone_number_id;
        const displayPhoneNumber = value.metadata?.display_phone_number;
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        if (!phoneNumberId || messages.length === 0) continue;

        // 1. Resolver establishment pelo phoneNumberId
        let settings = await getSettingsByPhoneNumber(phoneNumberId);
        if (!settings && displayPhoneNumber) {
          settings = await getSettingsByPhoneNumber(displayPhoneNumber);
        }

        if (!settings) {
          console.warn(`[WhatsApp Webhook] Nenhum establishment encontrado para phoneNumberId: ${phoneNumberId}`);
          continue;
        }

        if (!settings.isEnabled) {
          console.warn(`[WhatsApp Webhook] WhatsApp desabilitado para establishment ${settings.establishmentId}`);
          continue;
        }

        const establishmentId = settings.establishmentId;

        // Processar cada mensagem
        for (const msg of messages) {
          await processInboundMessage(
            establishmentId,
            settings,
            msg,
            contacts
          );
        }
      }
    }
  } catch (error) {
    console.error("[WhatsApp Webhook] Erro ao processar payload:", error);
  }
}

/**
 * Processa uma mensagem inbound individual.
 */
async function processInboundMessage(
  establishmentId: number,
  settings: NonNullable<Awaited<ReturnType<typeof getWhatsappSettings>>>,
  msg: any,
  contacts: any[]
) {
  try {
    const senderPhone = msg.from; // e.g. "5511999998888"
    const messageId = msg.id;
    const messageType = msg.type || "text";
    const messageContent = extractMessageContent(msg);
    const contactName = contacts.find((c: any) => c.wa_id === senderPhone)?.profile?.name;

    if (!senderPhone) {
      console.warn("[WhatsApp Webhook] Mensagem sem remetente, ignorando");
      return;
    }

    // 2. Normalizar telefone
    const normalized = normalizePhone(senderPhone);

    // 3. Localizar ou criar customer (opção B)
    let customer = await getCustomerByNormalizedPhone(normalized, establishmentId);
    let customerId: number | null = customer?.id ?? null;

    if (!customer) {
      // Criar customer automaticamente
      const newCustomer = await createCustomer({
        establishmentId,
        name: contactName || `WhatsApp ${senderPhone}`,
        phone: senderPhone,
        normalizedPhone: normalized,
        notes: "Criado automaticamente via WhatsApp",
      });
      customerId = newCustomer?.id ?? null;
      console.log(`[WhatsApp] Novo customer criado: ${customerId} para ${senderPhone}`);
    }

    // 4. Encontrar ou criar conversation
    const conversation = await findOrCreateConversation(
      establishmentId,
      senderPhone,
      normalized,
      customerId
    );

    // 5. Registrar mensagem inbound
    await createMessage({
      conversationId: conversation.id,
      direction: "inbound",
      messageType,
      content: messageContent,
      externalMessageId: messageId,
      status: "received",
      metadata: { raw: msg, contactName },
    });

    console.log(`[WhatsApp] Mensagem inbound registrada: conv=${conversation.id}, from=${senderPhone}`);

    // 6. Resposta automática se habilitada e conversa nova
    if (settings.autoReplyEnabled && conversation.isNew) {
      await sendAutoReply(establishmentId, settings, conversation.id, senderPhone);
    }
  } catch (error) {
    console.error("[WhatsApp] Erro ao processar mensagem inbound:", error);
  }
}

/**
 * Extrai o conteúdo textual de uma mensagem do WhatsApp.
 */
function extractMessageContent(msg: any): string | null {
  switch (msg.type) {
    case "text":
      return msg.text?.body ?? null;
    case "image":
      return msg.image?.caption ?? "[Imagem]";
    case "video":
      return msg.video?.caption ?? "[Vídeo]";
    case "audio":
      return "[Áudio]";
    case "document":
      return msg.document?.filename ?? "[Documento]";
    case "location":
      return `[Localização: ${msg.location?.latitude}, ${msg.location?.longitude}]`;
    case "sticker":
      return "[Sticker]";
    case "reaction":
      return `[Reação: ${msg.reaction?.emoji}]`;
    default:
      return `[${msg.type || "desconhecido"}]`;
  }
}

/**
 * Envia resposta automática inicial (stub).
 */
async function sendAutoReply(
  establishmentId: number,
  settings: NonNullable<Awaited<ReturnType<typeof getWhatsappSettings>>>,
  conversationId: number,
  recipientPhone: string
) {
  try {
    // Buscar nome do estabelecimento
    const establishment = await getEstablishmentById(establishmentId);
    const establishmentName = establishment?.name ?? "nosso estabelecimento";

    // Mensagem customizada ou padrão
    const message =
      settings.autoReplyMessage ??
      `Olá! Você entrou em contato com ${establishmentName}. Em breve você poderá agendar por aqui. Sua mensagem foi recebida! 😊`;

    // Enviar via stub
    const result = await sendWhatsappMessage(
      settings.phoneNumberId ?? "",
      settings.accessToken ?? "",
      recipientPhone,
      message
    );

    // Registrar mensagem outbound
    await createMessage({
      conversationId,
      direction: "outbound",
      messageType: "text",
      content: message,
      externalMessageId: result.messageId,
      status: result.success ? "sent" : "failed",
    });

    console.log(`[WhatsApp] Auto-reply enviado para ${recipientPhone} (conv=${conversationId})`);
  } catch (error) {
    console.error("[WhatsApp] Erro ao enviar auto-reply:", error);
  }
}
