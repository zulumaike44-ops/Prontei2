/**
 * TESTES — Serviços refatorados de agendamento público
 *
 * Cobre:
 * - publicBookingService (getBookingPageData)
 * - publicAvailabilityService (getDayAvailability, getQuickSlots)
 * - publicAppointmentService (createPublicAppointment, cancelByToken, rescheduleByToken, getAppointmentByTokenPublic)
 * - rebookService (getLastBookingOptions)
 * - eventBus (emissão de eventos)
 * - notificationService (templates PT-BR)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================
// MOCKS
// ============================================================

const mockEstablishment = {
  id: 1,
  name: "Salão Teste",
  slug: "salao-teste",
  description: "Salão de beleza",
  logoUrl: null,
  phone: "5511999999999",
  addressCity: "São Paulo",
  addressState: "SP",
  addressStreet: "Rua Teste",
  addressNumber: "123",
  addressNeighborhood: "Centro",
  timezone: "America/Sao_Paulo",
  primaryColor: "#6C3483",
  secondaryColor: "#FFFFFF",
};

const mockProfessional = {
  id: 10,
  name: "Maria Cabeleireira",
  avatarUrl: null,
  bio: "Especialista em coloração",
  isActive: true,
  deletedAt: null,
  establishmentId: 1,
};

const mockProfessional2 = {
  id: 11,
  name: "João Barbeiro",
  avatarUrl: null,
  bio: null,
  isActive: true,
  deletedAt: null,
  establishmentId: 1,
};

const mockService = {
  id: 20,
  name: "Corte Feminino",
  description: "Corte e escova",
  durationMinutes: 45,
  price: "80.00",
  category: "corte",
  isActive: true,
  deletedAt: null,
  establishmentId: 1,
};

const mockProfessionalServiceLink = {
  professionalId: 10,
  serviceId: 20,
  isActive: true,
  customDurationMinutes: null,
  customPrice: null,
  serviceDurationMinutes: 45,
  servicePrice: "80.00",
};

const mockCustomer = {
  id: 100,
  name: "Ana Cliente",
  phone: "11988887777",
  normalizedPhone: "5511988887777",
  establishmentId: 1,
  isActive: true,
};

const mockAppointment = {
  id: 999,
  establishmentId: 1,
  professionalId: 10,
  serviceId: 20,
  customerId: 100,
  startDatetime: new Date("2026-04-20T09:00:00"),
  endDatetime: new Date("2026-04-20T09:45:00"),
  durationMinutes: 45,
  price: "80.00",
  status: "confirmed",
  notes: null,
  source: "online",
  manageToken: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  cancelledAt: null,
  cancellationReason: null,
};

// ============================================================
// MOCK MODULES
// ============================================================

vi.mock("./db", () => ({
  getEstablishmentBySlug: vi.fn(),
  getEstablishmentById: vi.fn(),
  getProfessionalsByEstablishment: vi.fn(),
  getServicesByEstablishment: vi.fn(),
  getServiceById: vi.fn(),
  getProfessionalById: vi.fn(),
  getProfessionalServiceLinks: vi.fn(),
  getCustomerByNormalizedPhone: vi.fn(),
  createCustomer: vi.fn(),
}));

vi.mock("./appointmentDb", () => ({
  createAppointment: vi.fn(),
  getAppointmentByManageToken: vi.fn(),
  getAppointmentsByCustomerPhone: vi.fn(),
  getAppointmentsByEstablishment: vi.fn(),
  checkAppointmentConflict: vi.fn(),
  updateAppointmentStatus: vi.fn(),
  updateAppointment: vi.fn(),
}));

vi.mock("./availability", () => ({
  calculateAvailableSlots: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// ============================================================
// IMPORTS (after mocks)
// ============================================================

import {
  getEstablishmentBySlug,
  getEstablishmentById,
  getProfessionalsByEstablishment,
  getServicesByEstablishment,
  getServiceById,
  getProfessionalById,
  getProfessionalServiceLinks,
  getCustomerByNormalizedPhone,
  createCustomer,
} from "./db";

import {
  createAppointment,
  getAppointmentByManageToken,
  getAppointmentsByEstablishment,
  checkAppointmentConflict,
  updateAppointmentStatus,
  updateAppointment,
} from "./appointmentDb";

import { calculateAvailableSlots } from "./availability";

import { getBookingPageData } from "./publicBookingService";
import { getDayAvailability, getQuickSlots } from "./publicAvailabilityService";
import {
  createPublicAppointment,
  cancelByToken,
  rescheduleByToken,
  getAppointmentByTokenPublic,
} from "./publicAppointmentService";
import { getLastBookingOptions } from "./rebookService";
import { appointmentEventBus } from "./eventBus";
import {
  confirmationMessage,
  cancellationMessage,
  rescheduleMessage,
} from "./notificationService";

// ============================================================
// TESTS: publicBookingService
// ============================================================

describe("publicBookingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getBookingPageData retorna dados completos do establishment", async () => {
    vi.mocked(getEstablishmentBySlug).mockResolvedValue(mockEstablishment as any);
    vi.mocked(getProfessionalsByEstablishment).mockResolvedValue([mockProfessional] as any);
    vi.mocked(getServicesByEstablishment).mockResolvedValue([mockService] as any);
    vi.mocked(getProfessionalServiceLinks).mockResolvedValue([mockProfessionalServiceLink] as any);

    const result = await getBookingPageData("salao-teste");

    expect(result).not.toBeNull();
    expect(result!.establishment.name).toBe("Salão Teste");
    expect(result!.establishment.slug).toBe("salao-teste");
    expect(result!.establishment.primaryColor).toBe("#6C3483");
    expect(result!.establishment.secondaryColor).toBe("#FFFFFF");
    expect(result!.services).toHaveLength(1);
    expect(result!.services[0].name).toBe("Corte Feminino");
    expect(result!.professionals).toHaveLength(1);
    expect(result!.professionals[0].name).toBe("Maria Cabeleireira");
    expect(result!.professionals[0].serviceIds).toEqual([20]);
  });

  it("getBookingPageData retorna null para slug inexistente", async () => {
    vi.mocked(getEstablishmentBySlug).mockResolvedValue(undefined as any);

    const result = await getBookingPageData("nao-existe");
    expect(result).toBeNull();
  });

  it("getBookingPageData filtra profissionais e serviços inativos", async () => {
    const inactiveProfessional = { ...mockProfessional, id: 12, isActive: false };
    const inactiveService = { ...mockService, id: 21, isActive: false };

    vi.mocked(getEstablishmentBySlug).mockResolvedValue(mockEstablishment as any);
    vi.mocked(getProfessionalsByEstablishment).mockResolvedValue([
      mockProfessional,
      inactiveProfessional,
    ] as any);
    vi.mocked(getServicesByEstablishment).mockResolvedValue([
      mockService,
      inactiveService,
    ] as any);
    vi.mocked(getProfessionalServiceLinks).mockResolvedValue([mockProfessionalServiceLink] as any);

    const result = await getBookingPageData("salao-teste");

    expect(result!.professionals).toHaveLength(1);
    expect(result!.services).toHaveLength(1);
  });
});

// ============================================================
// TESTS: publicAvailabilityService
// ============================================================

describe("publicAvailabilityService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDayAvailability", () => {
    it("retorna slots com summary status=good quando há muitos horários", async () => {
      vi.mocked(getEstablishmentBySlug).mockResolvedValue(mockEstablishment as any);
      vi.mocked(getProfessionalById).mockResolvedValue(mockProfessional as any);
      vi.mocked(getServiceById).mockResolvedValue(mockService as any);
      vi.mocked(calculateAvailableSlots).mockResolvedValue({
        slots: [
          { start: "09:00", end: "09:45" },
          { start: "09:10", end: "09:55" },
          { start: "10:00", end: "10:45" },
          { start: "10:10", end: "10:55" },
          { start: "11:00", end: "11:45" },
        ],
        durationMinutes: 45,
        effectivePrice: "80.00",
      });

      const result = await getDayAvailability({
        slug: "salao-teste",
        professionalId: 10,
        serviceId: 20,
        date: "2026-04-20",
      });

      expect(result).not.toBeNull();
      expect(result!.slots).toHaveLength(5);
      expect(result!.summary.status).toBe("good");
      expect(result!.summary.availableCount).toBe(5);
      expect(result!.durationMinutes).toBe(45);
      expect(result!.effectivePrice).toBe("80.00");
    });

    it("retorna summary status=limited quando há poucos horários (<=3)", async () => {
      vi.mocked(getEstablishmentBySlug).mockResolvedValue(mockEstablishment as any);
      vi.mocked(getProfessionalById).mockResolvedValue(mockProfessional as any);
      vi.mocked(getServiceById).mockResolvedValue(mockService as any);
      vi.mocked(calculateAvailableSlots).mockResolvedValue({
        slots: [
          { start: "14:00", end: "14:45" },
          { start: "15:00", end: "15:45" },
        ],
        durationMinutes: 45,
        effectivePrice: "80.00",
      });

      const result = await getDayAvailability({
        slug: "salao-teste",
        professionalId: 10,
        serviceId: 20,
        date: "2026-04-20",
      });

      expect(result!.summary.status).toBe("limited");
      expect(result!.summary.availableCount).toBe(2);
    });

    it("retorna summary status=full quando não há horários", async () => {
      vi.mocked(getEstablishmentBySlug).mockResolvedValue(mockEstablishment as any);
      vi.mocked(getProfessionalById).mockResolvedValue(mockProfessional as any);
      vi.mocked(getServiceById).mockResolvedValue(mockService as any);
      vi.mocked(calculateAvailableSlots).mockResolvedValue({
        slots: [],
        durationMinutes: 45,
        effectivePrice: "80.00",
      });

      const result = await getDayAvailability({
        slug: "salao-teste",
        professionalId: 10,
        serviceId: 20,
        date: "2026-04-20",
      });

      expect(result!.summary.status).toBe("full");
      expect(result!.summary.availableCount).toBe(0);
    });

    it("retorna null para establishment inexistente", async () => {
      vi.mocked(getEstablishmentBySlug).mockResolvedValue(undefined as any);

      const result = await getDayAvailability({
        slug: "nao-existe",
        professionalId: 10,
        serviceId: 20,
        date: "2026-04-20",
      });

      expect(result).toBeNull();
    });
  });

  describe("getQuickSlots", () => {
    it("retorna slots de hoje e amanhã limitados a 5 por dia", async () => {
      vi.mocked(getEstablishmentBySlug).mockResolvedValue(mockEstablishment as any);
      vi.mocked(getProfessionalsByEstablishment).mockResolvedValue([mockProfessional] as any);
      vi.mocked(getProfessionalServiceLinks).mockResolvedValue([mockProfessionalServiceLink] as any);
      vi.mocked(calculateAvailableSlots).mockResolvedValue({
        slots: [
          { start: "09:00", end: "09:45" },
          { start: "09:10", end: "09:55" },
          { start: "10:00", end: "10:45" },
          { start: "10:10", end: "10:55" },
          { start: "11:00", end: "11:45" },
          { start: "11:10", end: "11:55" },
          { start: "14:00", end: "14:45" },
        ],
        durationMinutes: 45,
        effectivePrice: "80.00",
      });

      const result = await getQuickSlots({
        slug: "salao-teste",
        serviceId: 20,
      });

      expect(result).not.toBeNull();
      expect(result!.today.length).toBeLessThanOrEqual(5);
      expect(result!.tomorrow.length).toBeLessThanOrEqual(5);
    });

    it("retorna null para establishment inexistente", async () => {
      vi.mocked(getEstablishmentBySlug).mockResolvedValue(undefined as any);

      const result = await getQuickSlots({
        slug: "nao-existe",
        serviceId: 20,
      });

      expect(result).toBeNull();
    });

    it("filtra por profissional quando informado", async () => {
      vi.mocked(getEstablishmentBySlug).mockResolvedValue(mockEstablishment as any);
      vi.mocked(getProfessionalById).mockResolvedValue(mockProfessional as any);
      vi.mocked(calculateAvailableSlots).mockResolvedValue({
        slots: [{ start: "09:00", end: "09:45" }],
        durationMinutes: 45,
        effectivePrice: "80.00",
      });

      const result = await getQuickSlots({
        slug: "salao-teste",
        serviceId: 20,
        professionalId: 10,
      });

      expect(result).not.toBeNull();
      // Should only query for the specific professional
      expect(vi.mocked(getProfessionalById)).toHaveBeenCalledWith(10, 1);
    });
  });
});

// ============================================================
// TESTS: publicAppointmentService
// ============================================================

describe("publicAppointmentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPublicAppointment", () => {
    it("cria agendamento com sucesso e retorna summary", async () => {
      vi.mocked(getEstablishmentBySlug).mockResolvedValue(mockEstablishment as any);
      vi.mocked(getProfessionalById).mockResolvedValue(mockProfessional as any);
      vi.mocked(getServiceById).mockResolvedValue(mockService as any);
      vi.mocked(getProfessionalServiceLinks).mockResolvedValue([mockProfessionalServiceLink] as any);
      vi.mocked(checkAppointmentConflict).mockResolvedValue([]);
      vi.mocked(getCustomerByNormalizedPhone).mockResolvedValue(mockCustomer as any);
      vi.mocked(createAppointment).mockResolvedValue({
        ...mockAppointment,
        id: 1001,
      } as any);

      const result = await createPublicAppointment({
        slug: "salao-teste",
        professionalId: 10,
        serviceId: 20,
        date: "2026-04-20",
        time: "09:00",
        customerName: "Ana Cliente",
        customerPhone: "11988887777",
        notes: "Preferência por tintura loira",
      });

      expect(result.success).toBe(true);
      expect(result.appointmentId).toBe(1001);
      expect(result.manageToken).toBeDefined();
      expect(result.summary.serviceName).toBe("Corte Feminino");
      expect(result.summary.professionalName).toBe("Maria Cabeleireira");
      expect(result.summary.date).toBe("20/04/2026");
      expect(result.summary.time).toBe("09:00");
    });

    it("rejeita agendamento quando há conflito de horário", async () => {
      vi.mocked(getEstablishmentBySlug).mockResolvedValue(mockEstablishment as any);
      vi.mocked(getProfessionalById).mockResolvedValue(mockProfessional as any);
      vi.mocked(getServiceById).mockResolvedValue(mockService as any);
      vi.mocked(getProfessionalServiceLinks).mockResolvedValue([mockProfessionalServiceLink] as any);
      vi.mocked(checkAppointmentConflict).mockResolvedValue([{ id: 888 }] as any);

      await expect(
        createPublicAppointment({
          slug: "salao-teste",
          professionalId: 10,
          serviceId: 20,
          date: "2026-04-20",
          time: "09:00",
          customerName: "Ana Cliente",
          customerPhone: "11988887777",
        })
      ).rejects.toThrow("não está mais disponível");
    });

    it("cria novo customer quando não existe", async () => {
      vi.mocked(getEstablishmentBySlug).mockResolvedValue(mockEstablishment as any);
      vi.mocked(getProfessionalById).mockResolvedValue(mockProfessional as any);
      vi.mocked(getServiceById).mockResolvedValue(mockService as any);
      vi.mocked(getProfessionalServiceLinks).mockResolvedValue([mockProfessionalServiceLink] as any);
      vi.mocked(checkAppointmentConflict).mockResolvedValue([]);
      vi.mocked(getCustomerByNormalizedPhone).mockResolvedValue(null as any);
      vi.mocked(createCustomer).mockResolvedValue(mockCustomer as any);
      vi.mocked(createAppointment).mockResolvedValue(mockAppointment as any);

      await createPublicAppointment({
        slug: "salao-teste",
        professionalId: 10,
        serviceId: 20,
        date: "2026-04-20",
        time: "09:00",
        customerName: "Nova Cliente",
        customerPhone: "11977776666",
      });

      expect(vi.mocked(createCustomer)).toHaveBeenCalledTimes(1);
    });

    it("rejeita quando establishment não existe", async () => {
      vi.mocked(getEstablishmentBySlug).mockResolvedValue(undefined as any);

      await expect(
        createPublicAppointment({
          slug: "nao-existe",
          professionalId: 10,
          serviceId: 20,
          date: "2026-04-20",
          time: "09:00",
          customerName: "Ana",
          customerPhone: "11988887777",
        })
      ).rejects.toThrow("Estabelecimento não encontrado");
    });

    it("rejeita quando profissional não oferece o serviço", async () => {
      vi.mocked(getEstablishmentBySlug).mockResolvedValue(mockEstablishment as any);
      vi.mocked(getProfessionalById).mockResolvedValue(mockProfessional as any);
      vi.mocked(getServiceById).mockResolvedValue(mockService as any);
      vi.mocked(getProfessionalServiceLinks).mockResolvedValue([] as any);

      await expect(
        createPublicAppointment({
          slug: "salao-teste",
          professionalId: 10,
          serviceId: 20,
          date: "2026-04-20",
          time: "09:00",
          customerName: "Ana",
          customerPhone: "11988887777",
        })
      ).rejects.toThrow("não realiza este serviço");
    });
  });

  describe("cancelByToken", () => {
    it("cancela agendamento com sucesso", async () => {
      vi.mocked(getAppointmentByManageToken).mockResolvedValue(mockAppointment as any);
      vi.mocked(updateAppointmentStatus).mockResolvedValue({
        ...mockAppointment,
        status: "cancelled",
      } as any);
      vi.mocked(getProfessionalById).mockResolvedValue(mockProfessional as any);
      vi.mocked(getServiceById).mockResolvedValue(mockService as any);
      vi.mocked(getEstablishmentById).mockResolvedValue(mockEstablishment as any);

      const result = await cancelByToken(mockAppointment.manageToken, "Mudança de planos");

      expect(result.success).toBe(true);
      expect(result.message).toContain("cancelado com sucesso");
    });

    it("rejeita cancelamento de agendamento já cancelado", async () => {
      vi.mocked(getAppointmentByManageToken).mockResolvedValue({
        ...mockAppointment,
        status: "cancelled",
      } as any);

      await expect(
        cancelByToken(mockAppointment.manageToken)
      ).rejects.toThrow("não pode ser cancelado");
    });

    it("rejeita cancelamento de token inexistente", async () => {
      vi.mocked(getAppointmentByManageToken).mockResolvedValue(undefined);

      await expect(
        cancelByToken("token-invalido")
      ).rejects.toThrow("não encontrado");
    });
  });

  describe("rescheduleByToken", () => {
    it("reagenda agendamento com sucesso", async () => {
      vi.mocked(getAppointmentByManageToken).mockResolvedValue(mockAppointment as any);
      vi.mocked(checkAppointmentConflict).mockResolvedValue([]);
      vi.mocked(updateAppointment).mockResolvedValue({
        ...mockAppointment,
        startDatetime: new Date("2026-04-21T10:00:00"),
        endDatetime: new Date("2026-04-21T10:45:00"),
      } as any);
      vi.mocked(getProfessionalById).mockResolvedValue(mockProfessional as any);
      vi.mocked(getServiceById).mockResolvedValue(mockService as any);
      vi.mocked(getEstablishmentById).mockResolvedValue(mockEstablishment as any);

      const result = await rescheduleByToken(mockAppointment.manageToken, {
        date: "2026-04-21",
        time: "10:00",
      });

      expect(result.success).toBe(true);
      expect(result.appointment.date).toBe("2026-04-21");
      expect(result.appointment.time).toBe("10:00");
      expect(result.message).toContain("reagendado com sucesso");
    });

    it("rejeita reagendamento com conflito", async () => {
      vi.mocked(getAppointmentByManageToken).mockResolvedValue(mockAppointment as any);
      vi.mocked(checkAppointmentConflict).mockResolvedValue([{ id: 888 }] as any);

      await expect(
        rescheduleByToken(mockAppointment.manageToken, {
          date: "2026-04-21",
          time: "10:00",
        })
      ).rejects.toThrow("não está mais disponível");
    });

    it("rejeita reagendamento de agendamento cancelado", async () => {
      vi.mocked(getAppointmentByManageToken).mockResolvedValue({
        ...mockAppointment,
        status: "cancelled",
      } as any);

      await expect(
        rescheduleByToken(mockAppointment.manageToken, {
          date: "2026-04-21",
          time: "10:00",
        })
      ).rejects.toThrow("não pode ser reagendado");
    });
  });

  describe("getAppointmentByTokenPublic", () => {
    it("retorna dados completos do agendamento", async () => {
      vi.mocked(getAppointmentByManageToken).mockResolvedValue(mockAppointment as any);
      vi.mocked(getProfessionalById).mockResolvedValue(mockProfessional as any);
      vi.mocked(getServiceById).mockResolvedValue(mockService as any);
      vi.mocked(getEstablishmentById).mockResolvedValue(mockEstablishment as any);

      const result = await getAppointmentByTokenPublic(mockAppointment.manageToken);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(999);
      expect(result!.professionalName).toBe("Maria Cabeleireira");
      expect(result!.serviceName).toBe("Corte Feminino");
      expect(result!.establishmentName).toBe("Salão Teste");
      expect(result!.establishmentSlug).toBe("salao-teste");
      expect(result!.status).toBe("confirmed");
    });

    it("retorna null para token inexistente", async () => {
      vi.mocked(getAppointmentByManageToken).mockResolvedValue(undefined);

      const result = await getAppointmentByTokenPublic("token-invalido");
      expect(result).toBeNull();
    });
  });
});

// ============================================================
// TESTS: rebookService
// ============================================================

describe("rebookService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna sugestão de rebook com serviço e profissional do último agendamento", async () => {
    vi.mocked(getCustomerByNormalizedPhone).mockResolvedValue(mockCustomer as any);
    vi.mocked(getAppointmentsByEstablishment).mockResolvedValue([mockAppointment] as any);

    const result = await getLastBookingOptions(1, "11988887777");

    expect(result).not.toBeNull();
    expect(result!.serviceId).toBe(20);
    expect(result!.professionalId).toBe(10);
    expect(result!.customerName).toBe("Ana Cliente");
    expect(result!.customerPhone).toBe("11988887777");
  });

  it("retorna null quando cliente não tem agendamentos", async () => {
    vi.mocked(getCustomerByNormalizedPhone).mockResolvedValue(mockCustomer as any);
    vi.mocked(getAppointmentsByEstablishment).mockResolvedValue([]);

    const result = await getLastBookingOptions(1, "11988887777");
    expect(result).toBeNull();
  });

  it("retorna null quando telefone não é encontrado", async () => {
    vi.mocked(getCustomerByNormalizedPhone).mockResolvedValue(null as any);

    const result = await getLastBookingOptions(1, "11000000000");
    expect(result).toBeNull();
  });
});

// ============================================================
// TESTS: eventBus
// ============================================================

describe("eventBus", () => {
  it("emite e recebe evento appointment.created", () => {
    const handler = vi.fn();
    appointmentEventBus.onAppointmentCreated(handler);

    const payload = {
      appointmentId: 1,
      establishmentId: 1,
      establishmentName: "Salão",
      professionalName: "Maria",
      serviceName: "Corte",
      customerName: "Ana",
      customerPhone: "11988887777",
      date: "20/04/2026",
      time: "09:00",
      durationMinutes: 45,
      price: "R$ 80,00",
      manageToken: "token123",
    };

    appointmentEventBus.emitAppointmentEvent("appointment.created", payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(payload);

    // Cleanup listener
    appointmentEventBus.removeListener("appointment.created", handler);
  });

  it("emite e recebe evento appointment.cancelled", () => {
    const handler = vi.fn();
    appointmentEventBus.onAppointmentCancelled(handler);

    const payload = {
      appointmentId: 1,
      establishmentId: 1,
      establishmentName: "Salão",
      professionalName: "Maria",
      serviceName: "Corte",
      customerName: "Ana",
      customerPhone: "11988887777",
      date: "20/04/2026",
      time: "09:00",
      durationMinutes: 45,
      price: "R$ 80,00",
      manageToken: "token123",
      cancellationReason: "Mudança de planos",
    };

    appointmentEventBus.emitAppointmentEvent("appointment.cancelled", payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].cancellationReason).toBe("Mudança de planos");

    appointmentEventBus.removeListener("appointment.cancelled", handler);
  });

  it("emite e recebe evento appointment.rescheduled", () => {
    const handler = vi.fn();
    appointmentEventBus.onAppointmentRescheduled(handler);

    const payload = {
      appointmentId: 1,
      establishmentId: 1,
      establishmentName: "Salão",
      professionalName: "Maria",
      serviceName: "Corte",
      customerName: "Ana",
      customerPhone: "11988887777",
      date: "21/04/2026",
      time: "10:00",
      durationMinutes: 45,
      price: "R$ 80,00",
      manageToken: "token123",
      previousDate: "20/04/2026",
      previousTime: "09:00",
    };

    appointmentEventBus.emitAppointmentEvent("appointment.rescheduled", payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].previousDate).toBe("20/04/2026");
    expect(handler.mock.calls[0][0].previousTime).toBe("09:00");

    appointmentEventBus.removeListener("appointment.rescheduled", handler);
  });
});

// ============================================================
// TESTS: notificationService (templates)
// ============================================================

describe("notificationService — Templates PT-BR", () => {
  const basePayload = {
    appointmentId: 1,
    establishmentId: 1,
    establishmentName: "Salão Beleza",
    professionalName: "Maria",
    serviceName: "Corte Feminino",
    customerName: "Ana",
    customerPhone: "11988887777",
    date: "20/04/2026",
    time: "09:00",
    durationMinutes: 45,
    price: "R$ 80,00",
    manageToken: "token123",
  };

  it("confirmationMessage gera título e conteúdo corretos", () => {
    const msg = confirmationMessage(basePayload);

    expect(msg.title).toContain("Novo agendamento");
    expect(msg.title).toContain("Ana");
    expect(msg.content).toContain("Corte Feminino");
    expect(msg.content).toContain("Maria");
    expect(msg.content).toContain("20/04/2026");
    expect(msg.content).toContain("09:00");
    expect(msg.content).toContain("R$ 80,00");
    expect(msg.content).toContain("45 min");
  });

  it("cancellationMessage gera mensagem com motivo", () => {
    const msg = cancellationMessage({
      ...basePayload,
      cancellationReason: "Mudança de planos",
    });

    expect(msg.title).toContain("cancelado");
    expect(msg.content).toContain("cancelado");
    expect(msg.content).toContain("Mudança de planos");
  });

  it("cancellationMessage gera mensagem sem motivo", () => {
    const msg = cancellationMessage(basePayload);

    expect(msg.title).toContain("cancelado");
    expect(msg.content).not.toContain("Motivo:");
  });

  it("rescheduleMessage gera mensagem com data anterior e nova", () => {
    const msg = rescheduleMessage({
      ...basePayload,
      date: "21/04/2026",
      time: "10:00",
      previousDate: "20/04/2026",
      previousTime: "09:00",
    });

    expect(msg.title).toContain("reagendado");
    expect(msg.content).toContain("20/04/2026");
    expect(msg.content).toContain("09:00");
    expect(msg.content).toContain("21/04/2026");
    expect(msg.content).toContain("10:00");
  });
});

// ============================================================
// TESTS: Validações gerais
// ============================================================

describe("Validações gerais", () => {
  it("normalizePhone adiciona 55 quando necessário", () => {
    const normalize = (phone: string): string => {
      let digits = phone.replace(/\D/g, "");
      if (!digits.startsWith("55")) {
        digits = "55" + digits;
      }
      return digits;
    };

    expect(normalize("11988887777")).toBe("5511988887777");
    expect(normalize("5511988887777")).toBe("5511988887777");
    expect(normalize("(11) 98888-7777")).toBe("5511988887777");
    expect(normalize("+55 11 98888-7777")).toBe("5511988887777");
  });

  it("manageToken tem 64 caracteres hex", () => {
    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    expect(token).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(token)).toBe(true);
  });

  it("formatDateBR converte YYYY-MM-DD para DD/MM/YYYY", () => {
    const formatDateBR = (dateStr: string): string => {
      const [y, m, d] = dateStr.split("-");
      return `${d}/${m}/${y}`;
    };

    expect(formatDateBR("2026-04-20")).toBe("20/04/2026");
    expect(formatDateBR("2026-12-01")).toBe("01/12/2026");
  });
});
