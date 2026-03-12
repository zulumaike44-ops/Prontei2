/**
 * WHATSAPP WEBHOOK — Handler para recebimento e envio de mensagens via Z-API
 *
 * Integração com Z-API (https://z-api.io)
 * Base URL: https://api.z-api.io/instances/{instanceId}/token/{instanceToken}
 *
 * Estratégia de identificação do tenant no webhook:
 * O webhook recebe payload do Z-API que inclui o instanceId.
 * Usamos esse ID para localizar o whatsapp_settings e,
 * consequentemente, o establishment_id.
 *
 * Fluxo INBOUND:
 * 1. Recebe payload → extrai instanceId
 * 2. Localiza whatsapp_settings pelo instanceId → resolve establishment
 * 3. Normaliza telefone do remetente
 * 4. Localiza ou cria customer pelo telefone normalizado
 * 5. Encontra ou cria conversation
 * 6. Registra mensagem inbound
 * 7. Se autoReply habilitado e conversa nova → envia resposta automática
 *
 * Fluxo OUTBOUND:
 * 1. Valida credenciais (instanceId, instanceToken)
 * 2. Chama POST https://api.z-api.io/instances/{id}/token/{token}/send-text
 * 3. Extrai messageId real da resposta
 * 4. Trata erros de autenticação, configuração e rede
 */

import type { Request, Response } from "express";
import {
  getSettingsByInstanceId,
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
import { handleChatbotFlow, sendChatbotReply } from "./chatbotFlow";

// ============================================================
// Z-API — Envio REAL de mensagens
// ============================================================

const ZAPI_BASE_URL = "https://api.z-api.io/instances";

/**
 * Erros possíveis no envio de mensagem ao WhatsApp via Z-API.
 */
export class WhatsAppSendError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;

  constructor(message: string, statusCode: number, errorCode: string) {
    super(message);
    this.name = "WhatsAppSendError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

/**
 * Valida que as credenciais Z-API necessárias para envio estão presentes.
 */
export function validateSendCredentials(
  instanceId: string | null | undefined,
  instanceToken: string | null | undefined
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!instanceId || instanceId.trim() === "") {
    errors.push("Instance ID não configurado. Preencha nas configurações do WhatsApp.");
  }

  if (!instanceToken || instanceToken.trim() === "") {
    errors.push("Instance Token não configurado. Preencha nas configurações do WhatsApp.");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Monta a URL base da Z-API para uma instância.
 */
function buildZApiUrl(instanceId: string, instanceToken: string, endpoint: string): string {
  return `${ZAPI_BASE_URL}/${instanceId}/token/${instanceToken}/${endpoint}`;
}

/**
 * Monta os headers padrão para chamadas à Z-API.
 */
function buildZApiHeaders(clientToken?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (clientToken) {
    headers["Client-Token"] = clientToken;
  }
  return headers;
}

/**
 * Envia uma mensagem de texto ao WhatsApp via Z-API.
 *
 * Endpoint: POST https://api.z-api.io/instances/{instanceId}/token/{instanceToken}/send-text
 *
 * @param instanceId - ID da instância Z-API
 * @param instanceToken - Token da instância Z-API
 * @param clientToken - Token de segurança da conta Z-API (opcional)
 * @param recipientPhone - Número do destinatário no formato internacional (ex: 5511999998888)
 * @param messageText - Texto da mensagem a enviar
 * @returns Objeto com success, messageId e detalhes de erro se houver
 */
export async function sendWhatsappMessage(
  instanceId: string,
  instanceToken: string,
  clientToken: string | null | undefined,
  recipientPhone: string,
  messageText: string
): Promise<{
  success: boolean;
  messageId: string;
  error?: string;
  errorCode?: string;
}> {
  // 1. Validar credenciais
  const validation = validateSendCredentials(instanceId, instanceToken);
  if (!validation.valid) {
    const errorMsg = validation.errors.join("; ");
    console.error(`[Z-API] Credenciais inválidas: ${errorMsg}`);
    return {
      success: false,
      messageId: "",
      error: errorMsg,
      errorCode: "INVALID_CREDENTIALS",
    };
  }

  // 2. Montar URL e payload
  const url = buildZApiUrl(instanceId, instanceToken, "send-text");
  const payload = {
    phone: recipientPhone,
    message: messageText,
  };

  console.log(`[Z-API] Enviando mensagem para ${recipientPhone} via ${url}`);

  try {
    // 3. Chamar a API Z-API
    const response = await fetch(url, {
      method: "POST",
      headers: buildZApiHeaders(clientToken),
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json();

    // 4. Tratar resposta
    if (response.ok) {
      const externalMessageId =
        responseBody?.messageId ?? responseBody?.id ?? `zapi_${Date.now()}`;

      console.log(
        `[Z-API] Mensagem enviada com sucesso. ID: ${externalMessageId}, para: ${recipientPhone}`
      );

      return {
        success: true,
        messageId: externalMessageId,
      };
    } else {
      const errorMessage = responseBody?.error ?? responseBody?.message ?? "Erro desconhecido da Z-API";
      const errorCode = String(response.status);

      console.error(
        `[Z-API] Erro ${response.status}: ${errorMessage}`
      );

      let userFriendlyError = errorMessage;
      if (response.status === 401 || response.status === 403) {
        userFriendlyError =
          "Credenciais Z-API inválidas ou expiradas. Verifique o Instance ID e Token nas configurações.";
      } else if (response.status === 404) {
        userFriendlyError =
          "Instância Z-API não encontrada. Verifique o Instance ID.";
      } else if (response.status === 429) {
        userFriendlyError =
          "Limite de envio atingido. Aguarde alguns minutos e tente novamente.";
      }

      return {
        success: false,
        messageId: "",
        error: userFriendlyError,
        errorCode,
      };
    }
  } catch (networkError: any) {
    const errorMsg = networkError?.message ?? "Erro de rede desconhecido";
    console.error(`[Z-API] Erro de rede ao enviar mensagem: ${errorMsg}`);

    return {
      success: false,
      messageId: "",
      error: `Erro de rede ao conectar com a Z-API: ${errorMsg}`,
      errorCode: "NETWORK_ERROR",
    };
  }
}

// ============================================================
// WEBHOOK VERIFICATION (GET) — Z-API não precisa de verify
// ============================================================

/**
 * Handler para verificação do webhook.
 * Z-API não usa o mesmo mecanismo de verificação que a Meta.
 * Mantemos este handler para compatibilidade, retornando 200 OK.
 */
export async function handleWebhookVerification(req: Request, res: Response) {
  // Z-API não envia verificação de webhook como a Meta.
  // Se alguém acessar via GET, retornar 200 OK.
  res.status(200).json({ status: "ok", provider: "z-api" });
}

// ============================================================
// WEBHOOK MESSAGE HANDLER (POST)
// ============================================================

/**
 * Handler principal para recebimento de mensagens do Z-API.
 *
 * Payload esperado (Z-API):
 * {
 *   "instanceId": "...",
 *   "phone": "5544999999999",
 *   "fromMe": false,
 *   "messageId": "...",
 *   "momment": 1632228638000,
 *   "status": "RECEIVED",
 *   "chatName": "name",
 *   "senderName": "name",
 *   "type": "ReceivedCallback",
 *   "isGroup": false,
 *   "text": { "message": "texto da mensagem" }
 * }
 */
export async function handleWebhookMessage(req: Request, res: Response) {
  // Responder 200 imediatamente (Z-API exige resposta rápida)
  res.status(200).json({ status: "received" });

  try {
    const body = req.body;

    // Ignorar mensagens enviadas por nós mesmos
    if (body?.fromMe === true) {
      return;
    }

    // Ignorar mensagens de grupo
    if (body?.isGroup === true) {
      return;
    }

    // Ignorar status updates (delivery, read, etc.)
    if (body?.type && body.type !== "ReceivedCallback") {
      return;
    }

    const instanceId = body?.instanceId;
    const senderPhone = body?.phone;
    const messageId = body?.messageId;

    if (!instanceId || !senderPhone) {
      console.warn("[Z-API Webhook] Payload sem instanceId ou phone, ignorando");
      return;
    }

    // 1. Resolver establishment pelo instanceId
    const settings = await getSettingsByInstanceId(instanceId);

    if (!settings) {
      console.warn(`[Z-API Webhook] Nenhum establishment encontrado para instanceId: ${instanceId}`);
      return;
    }

    if (!settings.isEnabled) {
      console.warn(`[Z-API Webhook] WhatsApp desabilitado para establishment ${settings.establishmentId}`);
      return;
    }

    const establishmentId = settings.establishmentId;

    // Processar a mensagem
    await processInboundMessage(
      establishmentId,
      settings,
      body
    );
  } catch (error) {
    console.error("[Z-API Webhook] Erro ao processar payload:", error);
  }
}

/**
 * Processa uma mensagem inbound individual do Z-API.
 */
async function processInboundMessage(
  establishmentId: number,
  settings: NonNullable<Awaited<ReturnType<typeof getWhatsappSettings>>>,
  payload: any
) {
  try {
    const senderPhone = payload.phone;
    const messageId = payload.messageId;
    const messageType = detectMessageType(payload);
    const messageContent = extractMessageContent(payload);
    const contactName = payload.senderName || payload.chatName;

    if (!senderPhone) {
      console.warn("[Z-API Webhook] Mensagem sem remetente, ignorando");
      return;
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
      console.log(`[Z-API] Novo customer criado: ${customerId} para ${senderPhone}`);
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
      metadata: { raw: payload, contactName },
    });

    console.log(`[Z-API] Mensagem inbound registrada: conv=${conversation.id}, from=${senderPhone}`);

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
    console.error("[Z-API] Erro ao processar mensagem inbound:", error);
  }
}

/**
 * Detecta o tipo da mensagem Z-API.
 */
function detectMessageType(payload: any): string {
  if (payload.text?.message) return "text";
  if (payload.image) return "image";
  if (payload.video) return "video";
  if (payload.audio) return "audio";
  if (payload.document) return "document";
  if (payload.sticker) return "sticker";
  if (payload.location) return "location";
  if (payload.contact) return "contact";
  return "text";
}

/**
 * Extrai o conteúdo textual de uma mensagem do Z-API.
 */
function extractMessageContent(payload: any): string | null {
  // Texto simples
  if (payload.text?.message) return payload.text.message;

  // Imagem com legenda
  if (payload.image?.caption) return payload.image.caption;
  if (payload.image) return "[Imagem]";

  // Vídeo com legenda
  if (payload.video?.caption) return payload.video.caption;
  if (payload.video) return "[Vídeo]";

  // Áudio
  if (payload.audio) return "[Áudio]";

  // Documento
  if (payload.document?.fileName) return `[Documento: ${payload.document.fileName}]`;
  if (payload.document) return "[Documento]";

  // Localização
  if (payload.location) {
    return `[Localização: ${payload.location.latitude}, ${payload.location.longitude}]`;
  }

  // Sticker
  if (payload.sticker) return "[Sticker]";

  // Contato
  if (payload.contact) return "[Contato]";

  return null;
}

/**
 * Envia resposta automática inicial via Z-API.
 */
async function sendAutoReply(
  establishmentId: number,
  settings: NonNullable<Awaited<ReturnType<typeof getWhatsappSettings>>>,
  conversationId: number,
  recipientPhone: string
) {
  try {
    // Validar credenciais antes de tentar enviar
    const validation = validateSendCredentials(settings.instanceId, settings.instanceToken);
    if (!validation.valid) {
      console.warn(
        `[Z-API] Auto-reply não enviado — credenciais incompletas: ${validation.errors.join("; ")}`
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

    // Enviar via Z-API
    const result = await sendWhatsappMessage(
      settings.instanceId!,
      settings.instanceToken!,
      settings.clientToken,
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
        `[Z-API] Auto-reply enviado para ${recipientPhone} (conv=${conversationId}, msgId=${result.messageId})`
      );
    } else {
      console.warn(
        `[Z-API] Auto-reply FALHOU para ${recipientPhone}: ${result.error}`
      );
    }
  } catch (error) {
    console.error("[Z-API] Erro ao enviar auto-reply:", error);
  }
}
