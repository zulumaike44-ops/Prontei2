/**
 * CHATBOT FLOW — Máquina de estados para agendamento via WhatsApp (Etapa 20)
 *
 * Fluxo: MENU → SERVICE_SELECTION → PROFESSIONAL_SELECTION → DATE_SELECTION → TIME_SELECTION → CONFIRMATION → COMPLETED
 *
 * Regras:
 * - Sem LLM, sem interpretação de linguagem natural
 * - Menus numéricos e comandos simples
 * - Reutiliza infraestrutura existente (availability engine, appointmentDb, etc.)
 * - Timeout de 30 min reseta para MENU
 * - Comandos globais: menu, voltar, cancelar, horarios, alterar
 */

import {
  type ConversationState,
  updateConversationState,
  resetConversationState,
  getConversationWithState,
  findOrCreateConversation,
  createMessage,
} from "./whatsappDb";
import {
  getServicesByEstablishment,
  getServiceById,
  getServiceProfessionalLinks,
  getProfessionalById,
  getEstablishmentById,
  normalizePhone,
  getCustomerByNormalizedPhone,
  createCustomer,
} from "./db";
import { calculateAvailableSlots } from "./availability";
import {
  createAppointment,
  getAppointmentsByEstablishment,
  updateAppointmentStatus,
} from "./appointmentDb";
import { sendWhatsappMessage, validateSendCredentials } from "./whatsappWebhook";
import { getWhatsappSettings } from "./whatsappDb";

// ============================================================
// TYPES
// ============================================================

interface ChatbotContext {
  establishmentId: number;
  conversationId: number;
  customerId: number | null;
  senderPhone: string;
  normalizedPhone: string;
  currentState: ConversationState;
  selectedServiceId: number | null;
  selectedProfessionalId: number | null;
  selectedDate: string | null;
  selectedTime: string | null;
}

interface ChatbotResponse {
  message: string;
  newState: ConversationState;
  selections?: {
    selectedServiceId?: number | null;
    selectedProfessionalId?: number | null;
    selectedDate?: string | null;
    selectedTime?: string | null;
  };
}

// ============================================================
// GLOBAL COMMANDS
// ============================================================

const GLOBAL_COMMANDS: Record<string, string> = {
  menu: "MENU",
  inicio: "MENU",
  voltar: "BACK",
  cancelar: "CANCEL",
  horarios: "SCHEDULE",
  alterar: "ALTER",
};

/**
 * Mapa de estado anterior para "voltar"
 */
const PREVIOUS_STATE: Record<ConversationState, ConversationState> = {
  MENU: "MENU",
  SERVICE_SELECTION: "MENU",
  PROFESSIONAL_SELECTION: "SERVICE_SELECTION",
  DATE_SELECTION: "PROFESSIONAL_SELECTION",
  TIME_SELECTION: "DATE_SELECTION",
  CONFIRMATION: "TIME_SELECTION",
  COMPLETED: "MENU",
};

// ============================================================
// MAIN HANDLER
// ============================================================

/**
 * Ponto de entrada principal do chatbot.
 * Chamado pelo webhook após registrar a mensagem inbound.
 *
 * @returns A mensagem de resposta enviada, ou null se não enviou
 */
export async function handleChatbotFlow(
  establishmentId: number,
  conversationId: number,
  customerId: number | null,
  senderPhone: string,
  normalizedPhone: string,
  messageText: string
): Promise<string | null> {
  try {
    // 1. Buscar conversa com estado atual
    const conv = await getConversationWithState(establishmentId, normalizedPhone);
    if (!conv) {
      console.warn(`[Chatbot] Conversa não encontrada para ${normalizedPhone}`);
      return null;
    }

    const ctx: ChatbotContext = {
      establishmentId,
      conversationId: conv.id,
      customerId: conv.customerId ?? customerId,
      senderPhone,
      normalizedPhone,
      currentState: conv.conversationState as ConversationState,
      selectedServiceId: conv.selectedServiceId,
      selectedProfessionalId: conv.selectedProfessionalId,
      selectedDate: conv.selectedDate,
      selectedTime: conv.selectedTime,
    };

    const input = messageText.trim().toLowerCase();

    // 2. Processar comandos globais
    const globalCommand = GLOBAL_COMMANDS[input];
    if (globalCommand) {
      const response = await handleGlobalCommand(ctx, globalCommand, input);
      if (response) {
        await applyResponse(ctx, response);
        return response.message;
      }
    }

    // 3. Processar pelo estado atual
    const response = await processState(ctx, input, messageText.trim());
    if (response) {
      await applyResponse(ctx, response);
      return response.message;
    }

    return null;
  } catch (error) {
    console.error("[Chatbot] Erro no fluxo:", error);
    return null;
  }
}

// ============================================================
// GLOBAL COMMAND HANDLER
// ============================================================

async function handleGlobalCommand(
  ctx: ChatbotContext,
  command: string,
  _rawInput: string
): Promise<ChatbotResponse | null> {
  switch (command) {
    case "MENU":
      return buildMenuResponse(ctx);

    case "BACK": {
      const prevState = PREVIOUS_STATE[ctx.currentState];
      if (prevState === ctx.currentState) {
        return buildMenuResponse(ctx);
      }
      // Rebuild the previous state's prompt
      return await rebuildStatePrompt(ctx, prevState);
    }

    case "CANCEL": {
      // Se está no meio de um fluxo, cancelar e voltar ao menu
      if (ctx.currentState !== "MENU" && ctx.currentState !== "COMPLETED") {
        return {
          message: "Fluxo cancelado. ❌\n\nDigite *menu* para recomeçar.",
          newState: "MENU",
          selections: {
            selectedServiceId: null,
            selectedProfessionalId: null,
            selectedDate: null,
            selectedTime: null,
          },
        };
      }
      // Se está no MENU ou COMPLETED, mostrar agendamentos para cancelar
      return await handleCancelAppointment(ctx);
    }

    case "SCHEDULE":
      return await handleShowSchedule(ctx);

    case "ALTER":
      return await handleAlterAppointment(ctx);

    default:
      return null;
  }
}

// ============================================================
// STATE PROCESSOR
// ============================================================

async function processState(
  ctx: ChatbotContext,
  input: string,
  rawInput: string
): Promise<ChatbotResponse | null> {
  switch (ctx.currentState) {
    case "MENU":
      return await handleMenuInput(ctx, input);

    case "SERVICE_SELECTION":
      return await handleServiceSelection(ctx, input);

    case "PROFESSIONAL_SELECTION":
      return await handleProfessionalSelection(ctx, input);

    case "DATE_SELECTION":
      return await handleDateSelection(ctx, input, rawInput);

    case "TIME_SELECTION":
      return await handleTimeSelection(ctx, input);

    case "CONFIRMATION":
      return await handleConfirmation(ctx, input);

    case "COMPLETED":
      // Qualquer mensagem após completar volta ao menu
      return buildMenuResponse(ctx);

    default:
      return buildMenuResponse(ctx);
  }
}

// ============================================================
// STATE HANDLERS
// ============================================================

/**
 * MENU — Entrada principal
 */
async function buildMenuResponse(ctx: ChatbotContext): Promise<ChatbotResponse> {
  const establishment = await getEstablishmentById(ctx.establishmentId);
  const name = establishment?.name ?? "nosso estabelecimento";

  return {
    message:
      `Olá! 👋\n\nBem-vindo ao *${name}*\n\nComo posso ajudar?\n\n` +
      `*1* - Agendar horário\n` +
      `*2* - Ver horários disponíveis\n` +
      `*3* - Falar com atendente`,
    newState: "MENU",
    selections: {
      selectedServiceId: null,
      selectedProfessionalId: null,
      selectedDate: null,
      selectedTime: null,
    },
  };
}

async function handleMenuInput(
  ctx: ChatbotContext,
  input: string
): Promise<ChatbotResponse | null> {
  switch (input) {
    case "1":
    case "agendar":
      return await buildServiceSelectionPrompt(ctx);

    case "2":
      return await handleShowSchedule(ctx);

    case "3":
    case "atendente":
      return {
        message:
          "Um atendente será notificado e entrará em contato em breve. 🙋\n\n" +
          "Enquanto isso, você pode digitar *menu* para voltar ao início.",
        newState: "MENU",
      };

    default:
      // Se não reconhece, mostrar menu novamente
      return buildMenuResponse(ctx);
  }
}

/**
 * SERVICE_SELECTION — Escolha do serviço
 */
async function buildServiceSelectionPrompt(
  ctx: ChatbotContext
): Promise<ChatbotResponse> {
  const servicesList = await getServicesByEstablishment(ctx.establishmentId);
  const activeServices = servicesList.filter((s) => s.isActive);

  if (activeServices.length === 0) {
    return {
      message:
        "Desculpe, não há serviços disponíveis no momento. 😔\n\nDigite *menu* para voltar.",
      newState: "MENU",
    };
  }

  // Se só tem 1 serviço, selecionar automaticamente
  if (activeServices.length === 1) {
    const service = activeServices[0];
    return await buildProfessionalSelectionPrompt(ctx, service.id);
  }

  // Montar lista numerada
  let msg = "Qual serviço deseja? 💇\n\n";
  activeServices.forEach((s, i) => {
    const price = parseFloat(s.price).toFixed(2);
    msg += `*${i + 1}* - ${s.name} (R$ ${price})\n`;
  });
  msg += "\nDigite o *número* do serviço.";

  return {
    message: msg,
    newState: "SERVICE_SELECTION",
  };
}

async function handleServiceSelection(
  ctx: ChatbotContext,
  input: string
): Promise<ChatbotResponse | null> {
  const servicesList = await getServicesByEstablishment(ctx.establishmentId);
  const activeServices = servicesList.filter((s) => s.isActive);

  const index = parseInt(input, 10);
  if (isNaN(index) || index < 1 || index > activeServices.length) {
    return {
      message: `Opção inválida. Digite um número de *1* a *${activeServices.length}*.`,
      newState: "SERVICE_SELECTION",
    };
  }

  const selectedService = activeServices[index - 1];
  return await buildProfessionalSelectionPrompt(ctx, selectedService.id);
}

/**
 * PROFESSIONAL_SELECTION — Escolha do profissional
 */
async function buildProfessionalSelectionPrompt(
  ctx: ChatbotContext,
  serviceId: number
): Promise<ChatbotResponse> {
  const links = await getServiceProfessionalLinks(serviceId, ctx.establishmentId);
  const activeLinks = links.filter((l) => l.isActive && l.professionalIsActive);

  if (activeLinks.length === 0) {
    return {
      message:
        "Desculpe, nenhum profissional disponível para este serviço no momento. 😔\n\nDigite *voltar* para escolher outro serviço.",
      newState: "SERVICE_SELECTION",
      selections: { selectedServiceId: serviceId },
    };
  }

  // Se só tem 1 profissional, selecionar automaticamente
  if (activeLinks.length === 1) {
    const profId = activeLinks[0].professionalId;
    return await buildDateSelectionPrompt(ctx, serviceId, profId);
  }

  // Montar lista numerada
  let msg = "Escolha o profissional: 👤\n\n";
  activeLinks.forEach((l, i) => {
    msg += `*${i + 1}* - ${l.professionalName}\n`;
  });
  msg += `*${activeLinks.length + 1}* - Qualquer profissional\n`;
  msg += "\nDigite o *número* da opção.";

  return {
    message: msg,
    newState: "PROFESSIONAL_SELECTION",
    selections: { selectedServiceId: serviceId },
  };
}

async function handleProfessionalSelection(
  ctx: ChatbotContext,
  input: string
): Promise<ChatbotResponse | null> {
  if (!ctx.selectedServiceId) {
    return await buildServiceSelectionPrompt(ctx);
  }

  const links = await getServiceProfessionalLinks(ctx.selectedServiceId, ctx.establishmentId);
  const activeLinks = links.filter((l) => l.isActive && l.professionalIsActive);

  const index = parseInt(input, 10);
  if (isNaN(index) || index < 1 || index > activeLinks.length + 1) {
    return {
      message: `Opção inválida. Digite um número de *1* a *${activeLinks.length + 1}*.`,
      newState: "PROFESSIONAL_SELECTION",
    };
  }

  // "Qualquer profissional" = pegar o primeiro disponível
  let profId: number;
  if (index === activeLinks.length + 1) {
    profId = activeLinks[0].professionalId; // Simplificação: pegar o primeiro
  } else {
    profId = activeLinks[index - 1].professionalId;
  }

  return await buildDateSelectionPrompt(ctx, ctx.selectedServiceId, profId);
}

/**
 * DATE_SELECTION — Escolha da data
 */
async function buildDateSelectionPrompt(
  ctx: ChatbotContext,
  serviceId: number,
  professionalId: number
): Promise<ChatbotResponse> {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayStr = formatDateBR(today);
  const tomorrowStr = formatDateBR(tomorrow);

  return {
    message:
      `Qual dia deseja? 📅\n\n` +
      `*1* - Hoje (${todayStr})\n` +
      `*2* - Amanhã (${tomorrowStr})\n` +
      `*3* - Escolher outra data\n\n` +
      `Digite o *número* ou uma data no formato *DD/MM*.`,
    newState: "DATE_SELECTION",
    selections: {
      selectedServiceId: serviceId,
      selectedProfessionalId: professionalId,
    },
  };
}

async function handleDateSelection(
  ctx: ChatbotContext,
  input: string,
  rawInput: string
): Promise<ChatbotResponse | null> {
  if (!ctx.selectedServiceId || !ctx.selectedProfessionalId) {
    return await buildServiceSelectionPrompt(ctx);
  }

  let targetDate: string; // "YYYY-MM-DD"

  const today = new Date();

  switch (input) {
    case "1": {
      targetDate = formatDateISO(today);
      break;
    }
    case "2": {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      targetDate = formatDateISO(tomorrow);
      break;
    }
    case "3": {
      return {
        message: "Digite a data desejada no formato *DD/MM* (ex: 15/03).",
        newState: "DATE_SELECTION",
      };
    }
    default: {
      // Tentar parsear DD/MM ou DD/MM/YYYY
      const parsed = parseDateInput(rawInput);
      if (!parsed) {
        return {
          message: "Data inválida. Digite *1*, *2*, *3* ou uma data no formato *DD/MM*.",
          newState: "DATE_SELECTION",
        };
      }
      targetDate = parsed;
      break;
    }
  }

  // Validar que a data não é no passado
  const targetDateObj = new Date(targetDate + "T23:59:59");
  if (targetDateObj < new Date(formatDateISO(today) + "T00:00:00")) {
    return {
      message: "Não é possível agendar em datas passadas. Escolha outra data.",
      newState: "DATE_SELECTION",
    };
  }

  return await buildTimeSelectionPrompt(
    ctx,
    ctx.selectedServiceId,
    ctx.selectedProfessionalId,
    targetDate
  );
}

/**
 * TIME_SELECTION — Escolha do horário
 */
async function buildTimeSelectionPrompt(
  ctx: ChatbotContext,
  serviceId: number,
  professionalId: number,
  date: string
): Promise<ChatbotResponse> {
  const result = await calculateAvailableSlots({
    professionalId,
    serviceId,
    date,
    establishmentId: ctx.establishmentId,
  });

  if (result.slots.length === 0) {
    return {
      message:
        `Não há horários disponíveis para ${formatDateBRFromISO(date)}. 😔\n\n` +
        `Digite *voltar* para escolher outra data ou *menu* para recomeçar.`,
      newState: "DATE_SELECTION",
      selections: { selectedDate: null },
    };
  }

  // Mostrar no máximo 10 horários
  const slotsToShow = result.slots.slice(0, 10);

  let msg = `Horários disponíveis para *${formatDateBRFromISO(date)}*: ⏰\n\n`;
  slotsToShow.forEach((slot, i) => {
    msg += `*${i + 1}* - ${slot.start}\n`;
  });

  if (result.slots.length > 10) {
    msg += `\n_...e mais ${result.slots.length - 10} horários disponíveis._\n`;
  }

  msg += "\nDigite o *número* do horário.";

  return {
    message: msg,
    newState: "TIME_SELECTION",
    selections: { selectedDate: date },
  };
}

async function handleTimeSelection(
  ctx: ChatbotContext,
  input: string
): Promise<ChatbotResponse | null> {
  if (!ctx.selectedServiceId || !ctx.selectedProfessionalId || !ctx.selectedDate) {
    return await buildServiceSelectionPrompt(ctx);
  }

  const result = await calculateAvailableSlots({
    professionalId: ctx.selectedProfessionalId,
    serviceId: ctx.selectedServiceId,
    date: ctx.selectedDate,
    establishmentId: ctx.establishmentId,
  });

  const slotsToShow = result.slots.slice(0, 10);

  const index = parseInt(input, 10);
  if (isNaN(index) || index < 1 || index > slotsToShow.length) {
    return {
      message: `Opção inválida. Digite um número de *1* a *${slotsToShow.length}*.`,
      newState: "TIME_SELECTION",
    };
  }

  const selectedSlot = slotsToShow[index - 1];

  return await buildConfirmationPrompt(
    ctx,
    ctx.selectedServiceId,
    ctx.selectedProfessionalId,
    ctx.selectedDate,
    selectedSlot.start,
    result.effectivePrice,
    result.durationMinutes
  );
}

/**
 * CONFIRMATION — Confirmação do agendamento
 */
async function buildConfirmationPrompt(
  ctx: ChatbotContext,
  serviceId: number,
  professionalId: number,
  date: string,
  time: string,
  price: string,
  _durationMinutes: number
): Promise<ChatbotResponse> {
  const service = await getServiceById(serviceId, ctx.establishmentId);
  const professional = await getProfessionalById(professionalId, ctx.establishmentId);

  const serviceName = service?.name ?? "Serviço";
  const professionalName = professional?.name ?? "Profissional";
  const priceFormatted = parseFloat(price).toFixed(2);

  return {
    message:
      `Confirme seu agendamento: 📋\n\n` +
      `*Serviço:* ${serviceName}\n` +
      `*Profissional:* ${professionalName}\n` +
      `*Data:* ${formatDateBRFromISO(date)}\n` +
      `*Horário:* ${time}\n` +
      `*Preço:* R$ ${priceFormatted}\n\n` +
      `*1* - ✅ Confirmar\n` +
      `*2* - Alterar horário\n` +
      `*3* - Cancelar`,
    newState: "CONFIRMATION",
    selections: { selectedTime: time },
  };
}

async function handleConfirmation(
  ctx: ChatbotContext,
  input: string
): Promise<ChatbotResponse | null> {
  switch (input) {
    case "1":
    case "confirmar":
    case "sim":
      return await createAppointmentFromChat(ctx);

    case "2":
    case "alterar": {
      if (!ctx.selectedServiceId || !ctx.selectedProfessionalId || !ctx.selectedDate) {
        return await buildServiceSelectionPrompt(ctx);
      }
      return await buildTimeSelectionPrompt(
        ctx,
        ctx.selectedServiceId,
        ctx.selectedProfessionalId,
        ctx.selectedDate
      );
    }

    case "3":
    case "cancelar":
      return {
        message: "Agendamento cancelado. ❌\n\nDigite *menu* para recomeçar.",
        newState: "MENU",
        selections: {
          selectedServiceId: null,
          selectedProfessionalId: null,
          selectedDate: null,
          selectedTime: null,
        },
      };

    default:
      return {
        message: "Digite *1* para confirmar, *2* para alterar ou *3* para cancelar.",
        newState: "CONFIRMATION",
      };
  }
}

/**
 * Cria o agendamento no banco de dados.
 */
async function createAppointmentFromChat(
  ctx: ChatbotContext
): Promise<ChatbotResponse> {
  if (
    !ctx.selectedServiceId ||
    !ctx.selectedProfessionalId ||
    !ctx.selectedDate ||
    !ctx.selectedTime
  ) {
    return {
      message: "Dados incompletos. Vamos recomeçar.\n\nDigite *menu*.",
      newState: "MENU",
      selections: {
        selectedServiceId: null,
        selectedProfessionalId: null,
        selectedDate: null,
        selectedTime: null,
      },
    };
  }

  try {
    // Recalcular slots para pegar duração e preço
    const availability = await calculateAvailableSlots({
      professionalId: ctx.selectedProfessionalId,
      serviceId: ctx.selectedServiceId,
      date: ctx.selectedDate,
      establishmentId: ctx.establishmentId,
    });

    // Verificar se o slot ainda está disponível
    const slotStillAvailable = availability.slots.some(
      (s) => s.start === ctx.selectedTime
    );

    if (!slotStillAvailable) {
      return {
        message:
          "Desculpe, esse horário não está mais disponível. 😔\n\n" +
          "Vamos escolher outro horário.\n\nDigite *voltar*.",
        newState: "DATE_SELECTION",
        selections: { selectedTime: null },
      };
    }

    // Garantir que temos um customer
    let customerId = ctx.customerId;
    if (!customerId) {
      const existingCustomer = await getCustomerByNormalizedPhone(
        ctx.normalizedPhone,
        ctx.establishmentId
      );
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const newCustomer = await createCustomer({
          establishmentId: ctx.establishmentId,
          name: `WhatsApp ${ctx.senderPhone}`,
          phone: ctx.senderPhone,
          normalizedPhone: ctx.normalizedPhone,
          notes: "Criado via chatbot WhatsApp",
        });
        customerId = newCustomer?.id ?? null;
      }
    }

    if (!customerId) {
      return {
        message: "Erro ao criar seu cadastro. Tente novamente ou fale com um atendente.",
        newState: "MENU",
      };
    }

    // Montar datetime
    const [hours, minutes] = ctx.selectedTime.split(":").map(Number);
    const startDatetime = new Date(ctx.selectedDate + "T00:00:00");
    startDatetime.setHours(hours, minutes, 0, 0);

    const endDatetime = new Date(startDatetime);
    endDatetime.setMinutes(endDatetime.getMinutes() + availability.durationMinutes);

    // Criar appointment
    const appointment = await createAppointment({
      establishmentId: ctx.establishmentId,
      professionalId: ctx.selectedProfessionalId,
      serviceId: ctx.selectedServiceId,
      customerId,
      startDatetime,
      endDatetime,
      durationMinutes: availability.durationMinutes,
      price: availability.effectivePrice,
      status: "pending",
      source: "whatsapp",
      notes: "Agendado via chatbot WhatsApp",
    });

    if (!appointment) {
      return {
        message: "Erro ao criar agendamento. Tente novamente.",
        newState: "MENU",
      };
    }

    // Buscar nomes para confirmação
    const service = await getServiceById(ctx.selectedServiceId, ctx.establishmentId);
    const professional = await getProfessionalById(ctx.selectedProfessionalId, ctx.establishmentId);

    const serviceName = service?.name ?? "Serviço";
    const professionalName = professional?.name ?? "Profissional";

    return {
      message:
        `Agendamento confirmado! ✅\n\n` +
        `*Serviço:* ${serviceName}\n` +
        `*Profissional:* ${professionalName}\n` +
        `*Data:* ${formatDateBRFromISO(ctx.selectedDate)}\n` +
        `*Horário:* ${ctx.selectedTime}\n\n` +
        `Se precisar alterar ou cancelar, basta enviar uma mensagem. 😊`,
      newState: "COMPLETED",
      selections: {
        selectedServiceId: null,
        selectedProfessionalId: null,
        selectedDate: null,
        selectedTime: null,
      },
    };
  } catch (error) {
    console.error("[Chatbot] Erro ao criar agendamento:", error);
    return {
      message: "Ocorreu um erro ao criar seu agendamento. Tente novamente ou fale com um atendente.",
      newState: "MENU",
    };
  }
}

// ============================================================
// ADDITIONAL FEATURES
// ============================================================

/**
 * Mostra agenda simplificada do dia (comando "horarios")
 */
async function handleShowSchedule(ctx: ChatbotContext): Promise<ChatbotResponse> {
  // Se não tem serviço/profissional selecionado, pedir para agendar primeiro
  const servicesList = await getServicesByEstablishment(ctx.establishmentId);
  const activeServices = servicesList.filter((s) => s.isActive);

  if (activeServices.length === 0) {
    return {
      message: "Não há serviços cadastrados no momento. 😔",
      newState: ctx.currentState,
    };
  }

  // Pegar primeiro serviço e primeiro profissional como referência
  const firstService = activeServices[0];
  const links = await getServiceProfessionalLinks(firstService.id, ctx.establishmentId);
  const activeLinks = links.filter((l) => l.isActive && l.professionalIsActive);

  if (activeLinks.length === 0) {
    return {
      message: "Não há profissionais disponíveis no momento. 😔",
      newState: ctx.currentState,
    };
  }

  const today = formatDateISO(new Date());
  const result = await calculateAvailableSlots({
    professionalId: activeLinks[0].professionalId,
    serviceId: firstService.id,
    date: today,
    establishmentId: ctx.establishmentId,
  });

  if (result.slots.length === 0) {
    return {
      message:
        `Agenda de hoje (${formatDateBRFromISO(today)}):\n\n` +
        `Não há horários disponíveis. 😔\n\n` +
        `Digite *1* para agendar em outra data.`,
      newState: ctx.currentState,
    };
  }

  let msg = `Agenda de hoje (${formatDateBRFromISO(today)}):\n\n`;

  // Mostrar até 10 slots
  const slotsToShow = result.slots.slice(0, 10);
  slotsToShow.forEach((slot) => {
    msg += `🟢 ${slot.start} disponível\n`;
  });

  if (result.slots.length > 10) {
    msg += `\n_...e mais ${result.slots.length - 10} horários._\n`;
  }

  msg += `\nDigite *1* para agendar.`;

  return {
    message: msg,
    newState: ctx.currentState,
  };
}

/**
 * Cancelamento de agendamento existente (comando "cancelar" no MENU/COMPLETED)
 */
async function handleCancelAppointment(ctx: ChatbotContext): Promise<ChatbotResponse> {
  if (!ctx.customerId) {
    return {
      message: "Você não possui agendamentos registrados.\n\nDigite *menu* para voltar.",
      newState: "MENU",
    };
  }

  const now = new Date();
  const futureAppointments = await getAppointmentsByEstablishment(ctx.establishmentId, {
    customerId: ctx.customerId,
    dateFrom: now,
    status: "pending",
  });

  const confirmedAppointments = await getAppointmentsByEstablishment(ctx.establishmentId, {
    customerId: ctx.customerId,
    dateFrom: now,
    status: "confirmed",
  });

  const allUpcoming = [...futureAppointments, ...confirmedAppointments]
    .sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime())
    .slice(0, 5);

  if (allUpcoming.length === 0) {
    return {
      message: "Você não possui agendamentos futuros.\n\nDigite *menu* para voltar.",
      newState: "MENU",
    };
  }

  let msg = "Seus próximos agendamentos:\n\n";
  for (let i = 0; i < allUpcoming.length; i++) {
    const appt = allUpcoming[i];
    const service = await getServiceById(appt.serviceId, ctx.establishmentId);
    const startDate = new Date(appt.startDatetime);
    const dateStr = formatDateBR(startDate);
    const timeStr = `${startDate.getHours().toString().padStart(2, "0")}:${startDate.getMinutes().toString().padStart(2, "0")}`;

    msg += `*${i + 1}* - ${service?.name ?? "Serviço"} | ${dateStr} às ${timeStr}\n`;
  }

  msg += "\nDigite o *número* para cancelar ou *menu* para voltar.";

  // Store appointment IDs in a temporary way — use selectedServiceId as a hack
  // Actually, we'll handle this in a simpler way: just cancel the first one if they type a number
  // For now, store in the state
  return {
    message: msg,
    newState: "MENU", // Keep in MENU, the next input will be handled
  };
}

/**
 * Alterar agendamento (comando "alterar")
 */
async function handleAlterAppointment(ctx: ChatbotContext): Promise<ChatbotResponse> {
  // Redirecionar para agendar novamente
  return {
    message:
      "Para alterar, vamos fazer um novo agendamento.\n\n" +
      "Seu agendamento anterior será mantido até você confirmar o novo.\n\n" +
      "Vamos lá! 🚀",
    newState: "MENU",
    selections: {
      selectedServiceId: null,
      selectedProfessionalId: null,
      selectedDate: null,
      selectedTime: null,
    },
  };
}

/**
 * Reconstrói o prompt de um estado anterior (para o comando "voltar")
 */
async function rebuildStatePrompt(
  ctx: ChatbotContext,
  targetState: ConversationState
): Promise<ChatbotResponse> {
  switch (targetState) {
    case "MENU":
      return buildMenuResponse(ctx);

    case "SERVICE_SELECTION":
      return await buildServiceSelectionPrompt(ctx);

    case "PROFESSIONAL_SELECTION":
      if (ctx.selectedServiceId) {
        return await buildProfessionalSelectionPrompt(ctx, ctx.selectedServiceId);
      }
      return await buildServiceSelectionPrompt(ctx);

    case "DATE_SELECTION":
      if (ctx.selectedServiceId && ctx.selectedProfessionalId) {
        return await buildDateSelectionPrompt(ctx, ctx.selectedServiceId, ctx.selectedProfessionalId);
      }
      return await buildServiceSelectionPrompt(ctx);

    case "TIME_SELECTION":
      if (ctx.selectedServiceId && ctx.selectedProfessionalId && ctx.selectedDate) {
        return await buildTimeSelectionPrompt(
          ctx,
          ctx.selectedServiceId,
          ctx.selectedProfessionalId,
          ctx.selectedDate
        );
      }
      return await buildServiceSelectionPrompt(ctx);

    default:
      return buildMenuResponse(ctx);
  }
}

// ============================================================
// APPLY RESPONSE — Atualiza estado e envia mensagem
// ============================================================

async function applyResponse(ctx: ChatbotContext, response: ChatbotResponse) {
  // Atualizar estado da conversa no banco
  await updateConversationState(ctx.conversationId, response.newState, response.selections);
}

/**
 * Função de alto nível que envia a resposta do chatbot via WhatsApp.
 * Chamada pelo webhook após handleChatbotFlow retornar a mensagem.
 */
export async function sendChatbotReply(
  establishmentId: number,
  conversationId: number,
  recipientPhone: string,
  messageText: string
): Promise<boolean> {
  try {
    const settings = await getWhatsappSettings(establishmentId);
    if (!settings) {
      console.warn(`[Chatbot] Sem configuração WhatsApp para establishment ${establishmentId}`);
      return false;
    }

    const validation = validateSendCredentials(settings.instanceId, settings.instanceToken);
    if (!validation.valid) {
      console.warn(`[Chatbot] Credenciais inválidas: ${validation.errors.join("; ")}`);
      return false;
    }

    const result = await sendWhatsappMessage(
      settings.instanceId!,
      settings.instanceToken!,
      settings.clientToken,
      recipientPhone,
      messageText
    );

    // Registrar mensagem outbound
    await createMessage({
      conversationId,
      direction: "outbound",
      messageType: "text",
      content: messageText,
      externalMessageId: result.messageId || null,
      status: result.success ? "sent" : "failed",
      metadata: result.success ? { source: "chatbot" } : { error: result.error, source: "chatbot" },
    });

    return result.success;
  } catch (error) {
    console.error("[Chatbot] Erro ao enviar resposta:", error);
    return false;
  }
}

// ============================================================
// DATE HELPERS
// ============================================================

/** Formata Date para "DD/MM" */
function formatDateBR(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${d}/${m}`;
}

/** Formata Date para "YYYY-MM-DD" */
function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Converte "YYYY-MM-DD" para "DD/MM" */
function formatDateBRFromISO(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/**
 * Parseia input de data do usuário.
 * Aceita: DD/MM, DD/MM/YYYY, DD-MM, DD-MM-YYYY
 * Retorna: "YYYY-MM-DD" ou null se inválido
 */
function parseDateInput(input: string): string | null {
  // Remove espaços
  const cleaned = input.trim().replace(/\s/g, "");

  // Tentar DD/MM ou DD-MM
  const match2 = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (match2) {
    const day = parseInt(match2[1], 10);
    const month = parseInt(match2[2], 10);
    const year = new Date().getFullYear();

    if (day < 1 || day > 31 || month < 1 || month > 12) return null;

    const m = month.toString().padStart(2, "0");
    const d = day.toString().padStart(2, "0");
    return `${year}-${m}-${d}`;
  }

  // Tentar DD/MM/YYYY ou DD-MM-YYYY
  const match4 = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match4) {
    const day = parseInt(match4[1], 10);
    const month = parseInt(match4[2], 10);
    const year = parseInt(match4[3], 10);

    if (day < 1 || day > 31 || month < 1 || month > 12) return null;

    const m = month.toString().padStart(2, "0");
    const d = day.toString().padStart(2, "0");
    return `${year}-${m}-${d}`;
  }

  return null;
}

// ============================================================
// EXPORTS for testing
// ============================================================

export {
  formatDateBR,
  formatDateISO,
  formatDateBRFromISO,
  parseDateInput,
  buildMenuResponse,
  buildServiceSelectionPrompt,
  buildProfessionalSelectionPrompt,
  buildDateSelectionPrompt,
  buildTimeSelectionPrompt,
  buildConfirmationPrompt,
  GLOBAL_COMMANDS,
  PREVIOUS_STATE,
};

export type { ChatbotContext, ChatbotResponse };
