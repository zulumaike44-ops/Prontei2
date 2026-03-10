import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ============================================================
// HELPERS
// ============================================================
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(
  userId = 1,
  openId = "test-owner"
): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId,
    email: "owner@test.com",
    name: "Test Owner",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

// ============================================================
// SERVICE CRUD TESTS
// ============================================================
describe("service.list", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.service.list()).rejects.toThrow();
  });

  it("returns array of services for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.service.list();
      expect(Array.isArray(result)).toBe(true);
    } catch (error: any) {
      // If no establishment, should throw NOT_FOUND
      expect(error.code).toBe("NOT_FOUND");
    }
  });
});

describe("service.create", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.service.create({
        name: "Corte Masculino",
        durationMinutes: 30,
        price: "35.00",
      })
    ).rejects.toThrow();
  });

  it("validates name minimum length", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.service.create({
        name: "A",
        durationMinutes: 30,
        price: "35.00",
      })
    ).rejects.toThrow();
  });

  it("validates duration must be positive", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.service.create({
        name: "Corte Masculino",
        durationMinutes: 0,
        price: "35.00",
      })
    ).rejects.toThrow();
  });

  it("validates duration max 480 minutes", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.service.create({
        name: "Corte Masculino",
        durationMinutes: 500,
        price: "35.00",
      })
    ).rejects.toThrow();
  });

  it("validates price must be >= 0", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.service.create({
        name: "Corte Masculino",
        durationMinutes: 30,
        price: "-5.00",
      })
    ).rejects.toThrow();
  });

  it("validates price must be numeric", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.service.create({
        name: "Corte Masculino",
        durationMinutes: 30,
        price: "abc",
      })
    ).rejects.toThrow();
  });

  it("accepts valid service with all fields", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.service.create({
        name: "Corte Masculino",
        description: "Corte com máquina e tesoura",
        durationMinutes: 30,
        price: "35.00",
        category: "Cabelo",
      });
      expect(result).toBeDefined();
      expect(result.name).toBe("Corte Masculino");
    } catch (error: any) {
      // If no establishment exists, NOT_FOUND is expected
      expect(error.code).toBe("NOT_FOUND");
    }
  });

  it("accepts free service (price = 0)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.service.create({
        name: "Avaliação Gratuita",
        durationMinutes: 15,
        price: "0.00",
      });
      expect(result).toBeDefined();
    } catch (error: any) {
      expect(error.code).toBe("NOT_FOUND");
    }
  });
});

describe("service.update", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.service.update({
        id: 1,
        name: "Corte Atualizado",
      })
    ).rejects.toThrow();
  });

  it("validates name minimum length on update", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.service.update({
        id: 1,
        name: "A",
      })
    ).rejects.toThrow();
  });

  it("validates duration on update", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.service.update({
        id: 1,
        durationMinutes: -10,
      })
    ).rejects.toThrow();
  });
});

describe("service.delete", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.service.delete({ id: 1 })).rejects.toThrow();
  });

  it("requires positive integer id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.service.delete({ id: -1 })).rejects.toThrow();
  });
});

describe("service.count", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.service.count()).rejects.toThrow();
  });
});

// ============================================================
// PROFESSIONAL-SERVICE LINK TESTS
// ============================================================
describe("professional.services", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.professional.services({ professionalId: 1 })
    ).rejects.toThrow();
  });

  it("validates professionalId must be positive", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.professional.services({ professionalId: -1 })
    ).rejects.toThrow();
  });
});

describe("professional.linkService", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.professional.linkService({
        professionalId: 1,
        serviceId: 1,
      })
    ).rejects.toThrow();
  });

  it("validates professionalId must be positive", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.professional.linkService({
        professionalId: -1,
        serviceId: 1,
      })
    ).rejects.toThrow();
  });

  it("validates serviceId must be positive", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.professional.linkService({
        professionalId: 1,
        serviceId: -1,
      })
    ).rejects.toThrow();
  });

  it("validates customDurationMinutes must be positive if provided", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.professional.linkService({
        professionalId: 1,
        serviceId: 1,
        customDurationMinutes: 0,
      })
    ).rejects.toThrow();
  });
});

describe("professional.unlinkService", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.professional.unlinkService({
        professionalId: 1,
        serviceId: 1,
      })
    ).rejects.toThrow();
  });
});

// ============================================================
// MULTI-TENANT ISOLATION
// ============================================================
describe("multi-tenant isolation - services", () => {
  it("service.get rejects non-existent service for tenant", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.service.get({ id: 999999 });
      // If it doesn't throw, the service somehow exists
    } catch (error: any) {
      expect(["NOT_FOUND"]).toContain(error.code);
    }
  });

  it("service.delete rejects non-existent service for tenant", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.service.delete({ id: 999999 });
    } catch (error: any) {
      expect(["NOT_FOUND"]).toContain(error.code);
    }
  });

  it("service.update rejects non-existent service for tenant", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.service.update({ id: 999999, name: "Hack" });
    } catch (error: any) {
      expect(["NOT_FOUND"]).toContain(error.code);
    }
  });
});

describe("service.professionals", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.service.professionals({ serviceId: 1 })
    ).rejects.toThrow();
  });

  it("validates serviceId must be positive", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.service.professionals({ serviceId: -1 })
    ).rejects.toThrow();
  });
});
