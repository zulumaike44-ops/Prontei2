/**
 * WHATSAPP WEBHOOK — Handler para recebimento e envio de mensagens
 *
 * Integração REAL com Meta WhatsApp Cloud API v21.0
 *
 * Estratégia de identificação do tenant no webhook:
 * O webhook recebe payload do provider (Meta Cloud API) que inclui o phone_number_id
 * do número de destino. Usamos esse ID para localizar o whatsapp_settings e,
 * consequentemente, o establishment_id.
 *
 * Fluxo INBOUND:
 * 1. Recebe payload → extrai phone_number_id do destino
 * 2. Localiza whatsapp_settings pelo phoneNumberId → resolve establishment
 * 3. Normaliza telefone do remetente
 * 4. Localiza ou cria customer pelo telefone normalizado (opção B)
 * 5. Encontra ou cria conversation
 * 6. Registra mensagem inbound
 * 7. Se autoReply habilitado e conversa nova → envia resposta automática REAL
 *
 * Fluxo OUTBOUND:
 * 1. Valida credenciais (accessToken, phoneNumberId)
 * 2. Chama POST https://graph.facebook.com/v21.0/{phoneNumberId}/messages
 * 3. Extrai external_message_id real da resposta
 * 4. Trata erros de autenticação, configuração e rede
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
import { handleChatbotFlow, sendChatbotReply } from "./chatbotFlow";

// ============================================================
// META WHATSAPP CLOUD API — Envio REAL de mensagens
// ============================================================

const META_API_VERSION = "v21.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Erros possíveis no envio de mensagem ao WhatsApp.
 */
export class WhatsAppSendError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly errorSubcode: string;

  constructor(message: string, statusCode: number, errorCode: string, errorSubcode: string = "") {
    super(message);
    this.name = "WhatsAppSendError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.errorSubcode = errorSubcode;
  }
}

/**
 * Valida que as credenciais necessárias para envio estão presentes.
 * Retorna um objeto com os erros encontrados, ou null se tudo OK.
 */
export function validateSendCredentials(
  phoneNumberId: string | null | undefined,
  accessToken: string | null | undefined
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!phoneNumberId || phoneNumberId.trim() === "") {
    errors.push("phone_number_id não configurado. Preencha nas configurações do WhatsApp.");
  }

  if (!accessToken || accessToken.trim() === "") {
    errors.push("access_token não configurado. Preencha nas configurações do WhatsApp.");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Envia uma mensagem de texto ao WhatsApp via Meta Cloud API v21.0.
 *
 * Endpoint: POST https://graph.facebook.com/v21.0/{phone_number_id}/messages
 *
 * @param phoneNumberId - ID do número de telefone no Meta Business (não é o número em si)
 * @param accessToken - Token de acesso permanente ou temporário da Meta
 * @param recipientPhone - Número do destinatário no formato internacional (ex: 5511999998888)
 * @param messageText - Texto da mensagem a enviar
 * @returns Objeto com success, messageId (real da Meta) e detalhes de erro se houver
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
    console.error(`[WhatsApp API] Credenciais inválidas: ${errorMsg}`);
    return {
      success: false,
      messageId: "",
      error: errorMsg,
      errorCode: "INVALID_CREDENTIALS",
    };
  }

  // 2. Montar payload da Meta Cloud API
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

  console.log(`[WhatsApp API] Enviando mensagem para ${recipientPhone} via ${url}`);

  try {
    // 3. Chamar a API real da Meta
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json();

    // 4. Tratar resposta
    if (response.ok) {
      // Sucesso — extrair message ID real
      const externalMessageId =
        responseBody?.messages?.[0]?.id ?? `meta_${Date.now()}`;

      console.log(
        `[WhatsApp API] Mensagem enviada com sucesso. ID: ${externalMessageId}, para: ${recipientPhone}`
      );

      return {
        success: true,
        messageId: externalMessageId,
      };
    } else {
      // Erro da API — extrair detalhes
      const metaError = responseBody?.error;
      const errorMessage = metaError?.message ?? "Erro desconhecido da API Meta";
      const errorCode = String(metaError?.code ?? response.status);
      const errorSubcode = String(metaError?.error_subcode ?? "");

      console.error(
        `[WhatsApp API] Erro ${response.status}: ${errorMessage}`,
        `(code: ${errorCode}, subcode: ${errorSubcode})`
      );

      // Categorizar o erro para facilitar diagnóstico
      let userFriendlyError = errorMessage;
      if (response.status === 401 || errorCode === "190") {
        userFriendlyError =
          "Token de acesso inválido ou expirado. Atualize o access_token nas configurações.";
      } else if (response.status === 400 && errorCode === "131030") {
        userFriendlyError =
          "Número do destinatário não é um número WhatsApp válido.";
      } else if (response.status === 400 && errorCode === "131047") {
        userFriendlyError =
          "Mensagem não enviada: o destinatário precisa ter enviado uma mensagem nas últimas 24h (janela de conversa).";
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
    // 5. Erro de rede (timeout, DNS, etc.)
    const errorMsg = networkError?.message ?? "Erro de rede desconhecido";
    console.error(`[WhatsApp API] Erro de rede ao enviar mensagem: ${errorMsg}`);

    return {
      success: false,
      messageId: "",
      error: `Erro de rede ao conectar com a API do WhatsApp: ${errorMsg}`,
      errorCode: "NETWORK_ERROR",
    };
  }
}

// ============================================================
// WEBHOOK VERIFICATION (GET)
// ============================================================

/**
 * Handler para verificação do webhook pelo Meta Cloud API.
 * Meta envia GET com hub.mode, hub.verify_token e hub.challenge.
 *
 * Valida o token contra o webhook_verify_token configurado no banco.
 * Se não houver nenhum tenant configurado, usa fallback de variável de ambiente.
 */
export async function handleWebhookVerification(req: Request, res: Response) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"] as string | undefined;
  const challenge = req.query["hub.challenge"];

  if (mode !== "subscribe" || !token || !challenge) {
    console.warn("[WhatsApp Webhook] Verificação falhou — parâmetros inválidos");
    res.status(403).send("Forbidden");
    return;
  }

  try {
    // Tentar validar o token contra algum tenant configurado no banco
    const { getDb } = await import("./db");
    const db = await getDb();

    if (db) {
      const { whatsappSettings } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const settings = await db
        .select()
        .from(whatsappSettings)
        .where(eq(whatsappSettings.webhookVerifyToken, token))
        .limit(1);

      if (settings.length > 0) {
        console.log(
          `[WhatsApp Webhook] Verificação aceita para establishment ${settings[0].establishmentId}`
        );
        res.status(200).send(challenge);
        return;
      }
    }

    // Fallback: verificar contra variável de ambiente (para setup inicial)
    const envToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (envToken && token === envToken) {
      console.log("[WhatsApp Webhook] Verificação aceita via env WHATSAPP_WEBHOOK_VERIFY_TOKEN");
      res.status(200).send(challenge);
      return;
    }

    console.warn(`[WhatsApp Webhook] Token de verificação não reconhecido: ${token.slice(0, 8)}...`);
    res.status(403).send("Forbidden — verify_token inválido");
  } catch (error) {
    console.error("[WhatsApp Webhook] Erro ao validar verificação:", error);
    // Em caso de erro de DB, aceitar para não bloquear setup
    console.warn("[WhatsApp Webhook] Aceitando verificação por fallback (erro de DB)");
    res.status(200).send(challenge);
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

    // 6. Chatbot de agendamento (Etapa 20)
    // Se a mensagem é de texto, processar pelo chatbot
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

    // 7. Fallback: Resposta automática se habilitada e conversa nova (sem chatbot)
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
 * Envia resposta automática inicial via Meta Cloud API REAL.
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
        `[WhatsApp] Auto-reply não enviado — credenciais incompletas: ${validation.errors.join("; ")}`
      );
      // Registrar como falha no banco
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

    // Enviar via Meta Cloud API REAL
    const result = await sendWhatsappMessage(
      settings.phoneNumberId!,
      settings.accessToken!,
      recipientPhone,
      message
    );

    // Registrar mensagem outbound com ID real ou erro
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
        `[WhatsApp] Auto-reply enviado REAL para ${recipientPhone} (conv=${conversationId}, msgId=${result.messageId})`
      );
    } else {
      console.warn(
        `[WhatsApp] Auto-reply FALHOU para ${recipientPhone}: ${result.error}`
      );
    }
  } catch (error) {
    console.error("[WhatsApp] Erro ao enviar auto-reply:", error);
  }
}
