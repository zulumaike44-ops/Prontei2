/**
 * WHATSAPP WEBHOOK — Meta Cloud API
 *
 * Integração com Meta WhatsApp Business Cloud API
 * Base URL: https://graph.facebook.com/v21.0/{phoneNumberId}/messages
 *
 * Webhook:
 * - GET  /api/whatsapp/webhook → Verificação do webhook (Meta challenge)
 * - POST /api/whatsapp/webhook → Recebimento de mensagens
 *
 * Fluxo:
 * 1. Recebe payload → extrai phoneNumberId do metadata
 * 2. Localiza whatsapp_settings pelo phoneNumberId → resolve establishment
 * 3. Processa mensagem → chatbot de agendamento
 * 4. Envia resposta via Meta Cloud API
 *
 * Envio:
 * 1. Valida credenciais (phoneNumberId, accessToken)
 * 2. Chama POST https://graph.facebook.com/v21.0/{phoneNumberId}/messages
 * 3. Header: Authorization: Bearer {accessToken}
 */

import type { Request, Response } from "express";
import { ENV } from "./_core/env";
import {
  getWhatsappSettings,
  getSettingsByPhoneNumberId,
  findOrCreateConversation,
  createMessage,
} from "./whatsappDb";
import { getCustomerByNormalizedPhone, createCustomer, getEstablishmentById } from "./db";
import { handleChatbotFlow, sendChatbotReply } from "./chatbotFlow";
import crypto from "crypto";

const META_GRAPH_URL = "https://graph.facebook.com/v21.0";

// ============================================================
// VALIDATION HELPERS
// ============================================================

/**
 * Valida credenciais necessárias para enviar mensagens via Meta Cloud API.
 */
export function validateSendCredentials(
  phoneNumberId: string | null | undefined,
  accessToken: string | null | undefined
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!phoneNumberId || phoneNumberId.trim() === "") {
    errors.push("Phone Number ID é obrigatório");
  }

  if (!accessToken || accessToken.trim() === "") {
    errors.push("Access Token é obrigatório");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Normaliza número de telefone para formato internacional sem caracteres especiais.
 */
function normalizePhone(phone: string): string {
  // Remove tudo que não é dígito
  let digits = phone.replace(/\D/g, "");

  // Se começa com 55 e tem 12-13 dígitos, é BR
  if (digits.startsWith("55") && digits.length >= 12) {
    return digits;
  }

  // Se tem 10-11 dígitos sem código de país, assume BR
  if (digits.length >= 10 && digits.length <= 11) {
    return `55${digits}`;
  }

  return digits;
}

// ============================================================
// SEND MESSAGE VIA META CLOUD API
// ============================================================

/**
 * Envia uma mensagem de texto ao WhatsApp via Meta Cloud API.
 *
 * Endpoint: POST https://graph.facebook.com/v21.0/{phoneNumberId}/messages
 *
 * @param phoneNumberId - Phone Number ID da Meta
 * @param accessToken - Access Token (Bearer)
 * @param recipientPhone - Número do destinatário no formato internacional (ex: 5511999998888)
 * @param messageText - Texto da mensagem a enviar
 * @returns Objeto com success, messageId e detalhes de erro se houver
 */
export async function sendWhatsappMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  messageText: string
): Promise<{
  success: boolean;
  messageId: string;
  error?: string;
  errorCode?: string;
}> {
  // 1. Validar credenciais
  const validation = validateSendCredentials(phoneNumberId, accessToken);
  if (!validation.valid) {
    const errorMsg = validation.errors.join("; ");
    console.error(`[Meta API] Credenciais inválidas: ${errorMsg}`);
    return {
      success: false,
      messageId: "",
      error: errorMsg,
      errorCode: "INVALID_CREDENTIALS",
    };
  }

  // 2. Montar URL e payload
  const url = `${META_GRAPH_URL}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhone,
    type: "text",
    text: {
      preview_url: false,
      body: messageText,
    },
  };

  console.log(`[Meta API] Enviando mensagem para ${recipientPhone} via ${url}`);

  try {
    // 3. Chamar a Meta Cloud API
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json();

    // 4. Tratar resposta
    if (response.ok) {
      const externalMessageId =
        responseBody?.messages?.[0]?.id ?? `meta_${Date.now()}`;

      console.log(
        `[Meta API] Mensagem enviada com sucesso. ID: ${externalMessageId}, para: ${recipientPhone}`
      );

      return {
        success: true,
        messageId: externalMessageId,
      };
    } else {
      const errorMessage = responseBody?.error?.message ?? "Erro desconhecido da Meta API";
      const errorCode = String(responseBody?.error?.code ?? response.status);

      console.error(
        `[Meta API] Erro ao enviar mensagem: HTTP ${response.status} — ${errorMessage} (code: ${errorCode})`
      );

      return {
        success: false,
        messageId: "",
        error: errorMessage,
        errorCode,
      };
    }
  } catch (networkError: unknown) {
    const errorMsg = (networkError as Error)?.message ?? "Erro de rede desconhecido";
    console.error(`[Meta API] Erro de rede ao enviar mensagem: ${errorMsg}`);

    return {
      success: false,
      messageId: "",
      error: `Erro de rede ao conectar com a Meta API: ${errorMsg}`,
      errorCode: "NETWORK_ERROR",
    };
  }
}

/**
 * Envia template de mensagem via Meta Cloud API.
 */
export async function sendWhatsappTemplate(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  templateName: string,
  languageCode: string = "pt_BR",
  components?: any[]
): Promise<{
  success: boolean;
  messageId: string;
  error?: string;
  errorCode?: string;
}> {
  const validation = validateSendCredentials(phoneNumberId, accessToken);
  if (!validation.valid) {
    return {
      success: false,
      messageId: "",
      error: validation.errors.join("; "),
      errorCode: "INVALID_CREDENTIALS",
    };
  }

  const url = `${META_GRAPH_URL}/${phoneNumberId}/messages`;
  const payload: any = {
    messaging_product: "whatsapp",
    to: recipientPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  };

  if (components && components.length > 0) {
    payload.template.components = components;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json();

    if (response.ok) {
      return {
        success: true,
        messageId: responseBody?.messages?.[0]?.id ?? `meta_tmpl_${Date.now()}`,
      };
    } else {
      return {
        success: false,
        messageId: "",
        error: responseBody?.error?.message ?? "Erro ao enviar template",
        errorCode: String(responseBody?.error?.code ?? response.status),
      };
    }
  } catch (error: unknown) {
    return {
      success: false,
      messageId: "",
      error: `Erro de rede: ${(error as Error)?.message}`,
      errorCode: "NETWORK_ERROR",
    };
  }
}

// ============================================================
// WEBHOOK VERIFICATION (GET) — Meta Challenge
// ============================================================

/**
 * Handler para verificação do webhook pela Meta.
 * A Meta envia GET com hub.mode, hub.verify_token e hub.challenge.
 * Devemos retornar hub.challenge se o token bater.
 */
export async function handleWebhookVerification(req: Request, res: Response) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === ENV.whatsappWebhookVerifyToken) {
    console.log("[Meta Webhook] Verificação bem-sucedida");
    res.status(200).send(challenge);
  } else {
    console.warn("[Meta Webhook] Verificação falhou — token inválido");
    res.status(403).json({ error: "Forbidden" });
  }
}

// ============================================================
// WEBHOOK SIGNATURE VALIDATION
// ============================================================

/**
 * Valida a assinatura HMAC-SHA256 do payload do webhook.
 * A Meta assina todos os payloads com o App Secret.
 */
function validateWebhookSignature(req: Request): boolean {
  if (!ENV.metaAppSecret) {
    console.warn("[Meta Webhook] APP_SECRET não configurado, pulando validação de assinatura");
    return true; // Allow in development
  }

  const signature = req.headers["x-hub-signature-256"] as string;
  if (!signature) {
    console.warn("[Meta Webhook] Header x-hub-signature-256 ausente");
    return false;
  }

  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  const expectedSignature =
    "sha256=" +
    crypto.createHmac("sha256", ENV.metaAppSecret).update(rawBody).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// ============================================================
// WEBHOOK MESSAGE HANDLER (POST)
// ============================================================

/**
 * Handler principal para recebimento de mensagens da Meta Cloud API.
 *
 * Payload esperado (Meta Cloud API):
 * {
 *   "object": "whatsapp_business_account",
 *   "entry": [{
 *     "id": "WABA_ID",
 *     "changes": [{
 *       "value": {
 *         "messaging_product": "whatsapp",
 *         "metadata": {
 *           "display_phone_number": "551199999999",
 *           "phone_number_id": "PHONE_NUMBER_ID"
 *         },
 *         "contacts": [{ "profile": { "name": "Nome" }, "wa_id": "5511999998888" }],
 *         "messages": [{
 *           "from": "5511999998888",
 *           "id": "wamid.xxx",
 *           "timestamp": "1632228638",
 *           "type": "text",
 *           "text": { "body": "Olá" }
 *         }]
 *       },
 *       "field": "messages"
 *     }]
 *   }]
 * }
 */
export async function handleWebhookMessage(req: Request, res: Response) {
  // Responder 200 imediatamente (Meta exige resposta rápida)
  res.status(200).json({ status: "received" });

  try {
    const body = req.body;

    // Validar que é um evento WhatsApp
    if (body?.object !== "whatsapp_business_account") {
      return;
    }

    // Validar assinatura (segurança)
    if (!validateWebhookSignature(req)) {
      console.warn("[Meta Webhook] Assinatura inválida, ignorando payload");
      return;
    }

    // Processar cada entry
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;

        const value = change.value;
        if (!value) continue;

        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) {
          console.warn("[Meta Webhook] Payload sem phone_number_id, ignorando");
          continue;
        }

        // Processar status updates (delivery, read)
        if (value.statuses) {
          for (const status of value.statuses) {
            await processStatusUpdate(phoneNumberId, status);
          }
        }

        // Processar mensagens
        if (value.messages) {
          for (const message of value.messages) {
            const contact = value.contacts?.[0];
            await processInboundMessage(phoneNumberId, message, contact);
          }
        }
      }
    }
  } catch (error) {
    console.error("[Meta Webhook] Erro ao processar payload:", error);
  }
}

/**
 * Processa atualizações de status (delivered, read, failed).
 */
async function processStatusUpdate(phoneNumberId: string, status: any) {
  try {
    const { id: messageId, status: statusValue, recipient_id } = status;
    console.log(`[Meta Webhook] Status update: ${statusValue} para msg ${messageId} (dest: ${recipient_id})`);
    // TODO: Atualizar status da mensagem no banco se necessário
  } catch (error) {
    console.error("[Meta Webhook] Erro ao processar status update:", error);
  }
}

/**
 * Processa uma mensagem inbound individual da Meta Cloud API.
 */
async function processInboundMessage(
  phoneNumberId: string,
  message: any,
  contact: any
) {
  try {
    const senderPhone = message.from;
    const messageId = message.id;
    const messageType = message.type ?? "text";
    const messageContent = extractMessageContent(message);
    const contactName = contact?.profile?.name;

    if (!senderPhone) {
      console.warn("[Meta Webhook] Mensagem sem remetente, ignorando");
      return;
    }

    // 1. Resolver establishment pelo phoneNumberId
    const settings = await getSettingsByPhoneNumberId(phoneNumberId);

    if (!settings) {
      console.warn(`[Meta Webhook] Nenhum establishment encontrado para phoneNumberId: ${phoneNumberId}`);
      return;
    }

    if (!settings.isEnabled) {
      console.warn(`[Meta Webhook] WhatsApp desabilitado para establishment ${settings.establishmentId}`);
      return;
    }

    const establishmentId = settings.establishmentId;

    // 1b. Se recebemos mensagem, a instância está conectada — atualizar status
    const { upsertWhatsappSettings } = await import("./whatsappDb");
    if (settings.status !== "connected") {
      await upsertWhatsappSettings({
        establishmentId,
        status: "connected",
        connectedAt: new Date(),
      });
      console.log(`[Meta Webhook] Status atualizado para 'connected' (establishment ${establishmentId})`);
    }

    // 2. Normalizar telefone
    const normalized = normalizePhone(senderPhone);

    // 3. Localizar ou criar customer
    let customer = await getCustomerByNormalizedPhone(normalized, establishmentId);
    let customerId: number | null = customer?.id ?? null;

    if (!customer) {
      const newCustomer = await createCustomer({
        establishmentId,
        name: contactName || `WhatsApp ${senderPhone}`,
        phone: senderPhone,
        normalizedPhone: normalized,
        notes: "Criado automaticamente via WhatsApp",
      });
      customerId = newCustomer?.id ?? null;
      console.log(`[Meta API] Novo customer criado: ${customerId} para ${senderPhone}`);
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
      metadata: { raw: message, contactName },
    });

    console.log(`[Meta API] Mensagem inbound registrada: conv=${conversation.id}, from=${senderPhone}`);

    // 6. Chatbot de agendamento
    if (messageContent && messageType === "text") {
      const chatbotReply = await handleChatbotFlow(
        establishmentId,
        conversation.id,
        customerId,
        senderPhone,
        normalized,
        messageContent
      );

      if (chatbotReply) {
        await sendChatbotReply(
          establishmentId,
          conversation.id,
          senderPhone,
          chatbotReply
        );
        return;
      }
    }

    // 7. Fallback: Resposta automática se habilitada e conversa nova
    if (settings.autoReplyEnabled && conversation.isNew) {
      await sendAutoReply(establishmentId, settings, conversation.id, senderPhone);
    }
  } catch (error) {
    console.error("[Meta API] Erro ao processar mensagem inbound:", error);
  }
}

/**
 * Extrai o conteúdo textual de uma mensagem da Meta Cloud API.
 */
function extractMessageContent(message: any): string | null {
  switch (message.type) {
    case "text":
      return message.text?.body ?? null;
    case "image":
      return message.image?.caption ?? "[Imagem]";
    case "video":
      return message.video?.caption ?? "[Vídeo]";
    case "audio":
      return "[Áudio]";
    case "document":
      return message.document?.filename
        ? `[Documento: ${message.document.filename}]`
        : "[Documento]";
    case "location":
      return `[Localização: ${message.location?.latitude}, ${message.location?.longitude}]`;
    case "sticker":
      return "[Sticker]";
    case "contacts":
      return "[Contato]";
    case "interactive":
      // Button reply or list reply
      return message.interactive?.button_reply?.title
        ?? message.interactive?.list_reply?.title
        ?? "[Interativo]";
    case "reaction":
      return `[Reação: ${message.reaction?.emoji ?? ""}]`;
    default:
      return null;
  }
}

/**
 * Envia resposta automática inicial via Meta Cloud API.
 */
async function sendAutoReply(
  establishmentId: number,
  settings: NonNullable<Awaited<ReturnType<typeof getWhatsappSettings>>>,
  conversationId: number,
  recipientPhone: string
) {
  try {
    // Validar credenciais antes de tentar enviar
    const validation = validateSendCredentials(settings.phoneNumberId, settings.accessToken);
    if (!validation.valid) {
      console.warn(
        `[Meta API] Auto-reply não enviado — credenciais incompletas: ${validation.errors.join("; ")}`
      );
      await createMessage({
        conversationId,
        direction: "outbound",
        messageType: "text",
        content: settings.autoReplyMessage ?? "Resposta automática (não enviada — credenciais incompletas)",
        externalMessageId: null,
        status: "failed",
        metadata: { error: validation.errors },
      });
      return;
    }

    // Buscar nome do estabelecimento
    const establishment = await getEstablishmentById(establishmentId);
    const establishmentName = establishment?.name ?? "nosso estabelecimento";

    // Mensagem customizada ou padrão
    const message =
      settings.autoReplyMessage ??
      `Olá! Você entrou em contato com ${establishmentName}. Em breve você poderá agendar por aqui. Sua mensagem foi recebida! 😊`;

    // Enviar via Meta Cloud API
    const result = await sendWhatsappMessage(
      settings.phoneNumberId!,
      settings.accessToken!,
      recipientPhone,
      message
    );

    // Registrar mensagem outbound
    await createMessage({
      conversationId,
      direction: "outbound",
      messageType: "text",
      content: message,
      externalMessageId: result.messageId || null,
      status: result.success ? "sent" : "failed",
      metadata: result.success ? undefined : { error: result.error, errorCode: result.errorCode },
    });

    if (result.success) {
      console.log(
        `[Meta API] Auto-reply enviado para ${recipientPhone} (conv=${conversationId}, msgId=${result.messageId})`
      );
    } else {
      console.warn(
        `[Meta API] Auto-reply FALHOU para ${recipientPhone}: ${result.error}`
      );
    }
  } catch (error) {
    console.error("[Meta API] Erro ao enviar auto-reply:", error);
  }
}
