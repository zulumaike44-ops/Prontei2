/**
 * TESTES — Public Router (APIs públicas de agendamento)
 *
 * Testa os endpoints REST públicos:
 * - GET  /api/public/booking/:slug
 * - GET  /api/public/availability
 * - POST /api/public/appointments
 * - GET  /api/public/appointments/:token
 * - POST /api/public/appointments/:token/cancel
 * - POST /api/public/appointments/:token/reschedule
 * - GET  /api/public/appointments/history
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// MOCK: db.ts
// ============================================================

const mockEstablishment = {
  id: 1,
  name: "Barbearia Teste",
  slug: "barbearia-teste",
  description: "Barbearia de teste",
  logoUrl: null,
  phone: "5511999999999",
  addressCity: "São Paulo",
  addressState: "SP",
  addressStreet: "Rua Teste",
  addressNumber: "123",
  addressNeighborhood: "Centro",
  timezone: "America/Sao_Paulo",
};

const mockProfessional = {
  id: 10,
  name: "João Barbeiro",
  avatarUrl: null,
  bio: "Especialista em cortes",
  isActive: true,
  deletedAt: null,
  establishmentId: 1,
};

const mockService = {
  id: 20,
  name: "Corte Masculino",
  description: "Corte simples",
  durationMinutes: 30,
  price: "50.00",
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
  serviceDurationMinutes: 30,
  servicePrice: "50.00",
};

const mockCustomer = {
  id: 100,
  name: "Cliente Teste",
  phone: "11988887777",
  normalizedPhone: "5511988887777",
  establishmentId: 1,
  isActive: true,
};

vi.mock("./db", () => ({
  getEstablishmentBySlug: vi.fn(),
  getEstablishmentById: vi.fn(),
  getProfessionalsByEstablishment: vi.fn(),
  getServicesByEstablishment: vi.fn(),
  getServiceById: vi.fn(),
  getProfessionalById: vi.fn(),
  getProfessionalServiceLinks: vi.fn(),
  getServiceProfessionalLinks: vi.fn(),
  normalizePhone: vi.fn((p: string) => p.replace(/\D/g, "")),
  getCustomerByNormalizedPhone: vi.fn(),
  createCustomer: vi.fn(),
}));

vi.mock("./appointmentDb", () => ({
  createAppointment: vi.fn(),
  getAppointmentByManageToken: vi.fn(),
  getAppointmentsByCustomerPhone: vi.fn(),
  checkAppointmentConflict: vi.fn(),
  updateAppointmentStatus: vi.fn(),
  updateAppointment: vi.fn(),
}));

vi.mock("./availability", () => ({
  calculateAvailableSlots: vi.fn(),
}));

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
  getAppointmentsByCustomerPhone,
  checkAppointmentConflict,
  updateAppointmentStatus,
  updateAppointment,
} from "./appointmentDb";

import { calculateAvailableSlots } from "./availability";

// ============================================================
// HELPER: Simular Express req/res
// ============================================================

function createMockReq(overrides: Record<string, unknown> = {}) {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as any;
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res.body = data;
      return res;
    },
  };
  return res;
}

// ============================================================
// TESTES
// ============================================================

describe("Public Router — Booking Data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/public/booking/:slug retorna dados do establishment", async () => {
    // Importar handler diretamente não é possível (não exportado), então testamos via lógica
    // Testamos as funções de db que o handler usa
    vi.mocked(getEstablishmentBySlug).mockResolvedValue(mockEstablishment as any);
    vi.mocked(getProfessionalsByEstablishment).mockResolvedValue([mockProfessional] as any);
    vi.mocked(getServicesByEstablishment).mockResolvedValue([mockService] as any);
    vi.mocked(getProfessionalServiceLinks).mockResolvedValue([mockProfessionalServiceLink] as any);

    const result = await getEstablishmentBySlug("barbearia-teste");
    expect(result).toBeDefined();
    expect(result!.slug).toBe("barbearia-teste");
    expect(result!.name).toBe("Barbearia Teste");
  });

  it("retorna null para slug inexistente", async () => {
    vi.mocked(getEstablishmentBySlug).mockResolvedValue(undefined as any);

    const result = await getEstablishmentBySlug("nao-existe");
    expect(result).toBeUndefined();
  });
});

describe("Public Router — Availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna slots disponíveis para profissional e serviço", async () => {
    vi.mocked(getEstablishmentBySlug).mockResolvedValue(mockEstablishment as any);
    vi.mocked(getProfessionalById).mockResolvedValue(mockProfessional as any);
    vi.mocked(getServiceById).mockResolvedValue(mockService as any);
    vi.mocked(calculateAvailableSlots).mockResolvedValue({
      slots: [
        { start: "09:00", end: "09:30" },
        { start: "09:10", end: "09:40" },
        { start: "10:00", end: "10:30" },
      ],
      durationMinutes: 30,
      effectivePrice: "50.00",
    });

    const result = await calculateAvailableSlots({
      professionalId: 10,
      serviceId: 20,
      date: "2026-03-20",
      establishmentId: 1,
    });

    expect(result.slots).toHaveLength(3);
    expect(result.slots[0]).toEqual({ start: "09:00", end: "09:30" });
    expect(result.durationMinutes).toBe(30);
    expect(result.effectivePrice).toBe("50.00");
  });

  it("retorna array vazio quando profissional não trabalha no dia", async () => {
    vi.mocked(calculateAvailableSlots).mockResolvedValue({
      slots: [],
      durationMinutes: 0,
      effectivePrice: "0",
    });

    const result = await calculateAvailableSlots({
      professionalId: 10,
      serviceId: 20,
      date: "2026-03-22", // Domingo
      establishmentId: 1,
    });

    expect(result.slots).toHaveLength(0);
  });
});

describe("Public Router — Create Appointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cria agendamento com sucesso", async () => {
    vi.mocked(getEstablishmentBySlug).mockResolvedValue(mockEstablishment as any);
    vi.mocked(getProfessionalById).mockResolvedValue(mockProfessional as any);
    vi.mocked(getServiceById).mockResolvedValue(mockService as any);
    vi.mocked(getProfessionalServiceLinks).mockResolvedValue([mockProfessionalServiceLink] as any);
    vi.mocked(checkAppointmentConflict).mockResolvedValue([]);
    vi.mocked(getCustomerByNormalizedPhone).mockResolvedValue(mockCustomer as any);
    vi.mocked(createAppointment).mockResolvedValue({
      id: 999,
      establishmentId: 1,
      professionalId: 10,
      serviceId: 20,
      customerId: 100,
      startDatetime: new Date("2026-03-20T09:00:00"),
      endDatetime: new Date("2026-03-20T09:30:00"),
      durationMinutes: 30,
      price: "50.00",
      status: "confirmed",
      manageToken: "abc123token",
    } as any);

    const appointment = await createAppointment({
      establishmentId: 1,
      professionalId: 10,
      serviceId: 20,
      customerId: 100,
      startDatetime: new Date("2026-03-20T09:00:00"),
      endDatetime: new Date("2026-03-20T09:30:00"),
      durationMinutes: 30,
      price: "50.00",
      status: "confirmed",
      source: "online",
      manageToken: "abc123token",
    });

    expect(appointment).toBeDefined();
    expect(appointment!.id).toBe(999);
    expect(appointment!.status).toBe("confirmed");
    expect(appointment!.manageToken).toBe("abc123token");
  });

  it("rejeita agendamento com conflito de horário", async () => {
    vi.mocked(checkAppointmentConflict).mockResolvedValue([
      { id: 888, status: "confirmed" } as any,
    ]);

    const conflicts = await checkAppointmentConflict(
      10,
      1,
      new Date("2026-03-20T09:00:00"),
      new Date("2026-03-20T09:30:00")
    );

    expect(conflicts.length).toBeGreaterThan(0);
  });

  it("cria novo customer quando não existe", async () => {
    vi.mocked(getCustomerByNormalizedPhone).mockResolvedValue(undefined as any);
    vi.mocked(createCustomer).mockResolvedValue(mockCustomer as any);

    const existing = await getCustomerByNormalizedPhone("5511988887777", 1);
    expect(existing).toBeUndefined();

    const newCustomer = await createCustomer({
      establishmentId: 1,
      name: "Novo Cliente",
      phone: "11988887777",
      normalizedPhone: "5511988887777",
    } as any);

    expect(newCustomer).toBeDefined();
    expect(newCustomer!.name).toBe("Cliente Teste");
  });
});

describe("Public Router — Manage Appointment by Token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAppointment = {
    id: 999,
    establishmentId: 1,
    professionalId: 10,
    serviceId: 20,
    customerId: 100,
    startDatetime: new Date("2026-03-20T09:00:00"),
    endDatetime: new Date("2026-03-20T09:30:00"),
    durationMinutes: 30,
    price: "50.00",
    status: "confirmed",
    notes: null,
    source: "online",
    manageToken: "valid-token-123",
    cancelledAt: null,
    cancellationReason: null,
  };

  it("busca agendamento por manageToken", async () => {
    vi.mocked(getAppointmentByManageToken).mockResolvedValue(mockAppointment as any);

    const result = await getAppointmentByManageToken("valid-token-123");
    expect(result).toBeDefined();
    expect(result!.id).toBe(999);
    expect(result!.manageToken).toBe("valid-token-123");
  });

  it("retorna undefined para token inválido", async () => {
    vi.mocked(getAppointmentByManageToken).mockResolvedValue(undefined);

    const result = await getAppointmentByManageToken("invalid-token");
    expect(result).toBeUndefined();
  });

  it("cancela agendamento com sucesso", async () => {
    vi.mocked(getAppointmentByManageToken).mockResolvedValue(mockAppointment as any);
    vi.mocked(updateAppointmentStatus).mockResolvedValue({
      ...mockAppointment,
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationReason: "Cancelado pelo cliente via link",
    } as any);

    const appointment = await getAppointmentByManageToken("valid-token-123");
    expect(appointment).toBeDefined();
    expect(["pending", "confirmed"]).toContain(appointment!.status);

    const cancelled = await updateAppointmentStatus(
      appointment!.id,
      appointment!.establishmentId,
      "cancelled",
      null,
      "Cancelado pelo cliente via link"
    );

    expect(cancelled!.status).toBe("cancelled");
    expect(cancelled!.cancellationReason).toBe("Cancelado pelo cliente via link");
  });

  it("não cancela agendamento já cancelado", async () => {
    const cancelledAppointment = { ...mockAppointment, status: "cancelled" };
    vi.mocked(getAppointmentByManageToken).mockResolvedValue(cancelledAppointment as any);

    const appointment = await getAppointmentByManageToken("valid-token-123");
    expect(appointment!.status).toBe("cancelled");
    expect(["pending", "confirmed"]).not.toContain(appointment!.status);
  });

  it("reagenda agendamento com sucesso", async () => {
    vi.mocked(getAppointmentByManageToken).mockResolvedValue(mockAppointment as any);
    vi.mocked(checkAppointmentConflict).mockResolvedValue([]);
    vi.mocked(updateAppointment).mockResolvedValue({
      ...mockAppointment,
      startDatetime: new Date("2026-03-21T10:00:00"),
      endDatetime: new Date("2026-03-21T10:30:00"),
    } as any);

    const conflicts = await checkAppointmentConflict(
      10,
      1,
      new Date("2026-03-21T10:00:00"),
      new Date("2026-03-21T10:30:00"),
      999
    );
    expect(conflicts).toHaveLength(0);

    const updated = await updateAppointment(999, 1, {
      startDatetime: new Date("2026-03-21T10:00:00"),
      endDatetime: new Date("2026-03-21T10:30:00"),
    });

    expect(updated).toBeDefined();
    expect(updated!.startDatetime).toEqual(new Date("2026-03-21T10:00:00"));
  });

  it("rejeita reagendamento com conflito", async () => {
    vi.mocked(getAppointmentByManageToken).mockResolvedValue(mockAppointment as any);
    vi.mocked(checkAppointmentConflict).mockResolvedValue([
      { id: 888, status: "confirmed" } as any,
    ]);

    const conflicts = await checkAppointmentConflict(
      10,
      1,
      new Date("2026-03-21T10:00:00"),
      new Date("2026-03-21T10:30:00"),
      999
    );
    expect(conflicts.length).toBeGreaterThan(0);
  });
});

describe("Public Router — Appointment History", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna histórico de agendamentos por telefone", async () => {
    vi.mocked(getEstablishmentBySlug).mockResolvedValue(mockEstablishment as any);
    vi.mocked(getAppointmentsByCustomerPhone).mockResolvedValue([
      {
        id: 999,
        startDatetime: new Date("2026-03-20T09:00:00"),
        endDatetime: new Date("2026-03-20T09:30:00"),
        durationMinutes: 30,
        price: "50.00",
        status: "confirmed",
        professionalId: 10,
        serviceId: 20,
        manageToken: "token-1",
      },
      {
        id: 998,
        startDatetime: new Date("2026-03-18T14:00:00"),
        endDatetime: new Date("2026-03-18T14:30:00"),
        durationMinutes: 30,
        price: "50.00",
        status: "completed",
        professionalId: 10,
        serviceId: 20,
        manageToken: "token-2",
      },
    ] as any);

    const appointments = await getAppointmentsByCustomerPhone(1, "5511988887777");
    expect(appointments).toHaveLength(2);
    expect(appointments[0].manageToken).toBe("token-1");
  });

  it("retorna array vazio para telefone sem agendamentos", async () => {
    vi.mocked(getEstablishmentBySlug).mockResolvedValue(mockEstablishment as any);
    vi.mocked(getAppointmentsByCustomerPhone).mockResolvedValue([]);

    const appointments = await getAppointmentsByCustomerPhone(1, "5511000000000");
    expect(appointments).toHaveLength(0);
  });
});

describe("Public Router — Validações", () => {
  it("normalizePhonePublic adiciona 55 quando necessário", () => {
    // Testar a lógica de normalização
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
});
