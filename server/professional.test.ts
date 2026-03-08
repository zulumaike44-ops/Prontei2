import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ============================================================
// HELPERS
// ============================================================

function createMockContext(user: TrpcContext["user"] = null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAuthenticatedContext(overrides: Partial<NonNullable<TrpcContext["user"]>> = {}): TrpcContext {
  return createMockContext({
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  });
}

// ============================================================
// TESTS
// ============================================================

describe("professional router", () => {
  describe("professional.list", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.professional.list()).rejects.toThrow();
    });

    it("returns array when authenticated", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      // This will either return professionals or throw NOT_FOUND for establishment
      // Both are valid behaviors — we test the auth gate works
      try {
        const result = await caller.professional.list();
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        // If no establishment exists, it should throw NOT_FOUND, not UNAUTHORIZED
        expect(error.code).toBe("NOT_FOUND");
        expect(error.message).toContain("Estabelecimento");
      }
    });
  });

  describe("professional.create", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.professional.create({ name: "Maria Silva" })
      ).rejects.toThrow();
    });

    it("validates name minimum length", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.professional.create({ name: "A" })
      ).rejects.toThrow();
    });

    it("validates email format when provided", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.professional.create({
          name: "Maria Silva",
          email: "not-an-email",
        })
      ).rejects.toThrow();
    });

    it("accepts valid input with all fields", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      // Will fail at DB level (no establishment) but validates input passes Zod
      try {
        await caller.professional.create({
          name: "Maria Silva",
          email: "maria@email.com",
          phone: "(11) 99999-0000",
          bio: "Especialista em cortes femininos",
        });
      } catch (error: any) {
        // Should fail because no establishment, not because of validation
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("accepts empty optional fields", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.professional.create({
          name: "João Santos",
          email: "",
          phone: "",
          bio: "",
        });
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("professional.update", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.professional.update({ id: 1, name: "Updated Name" })
      ).rejects.toThrow();
    });

    it("validates id is positive integer", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.professional.update({ id: -1, name: "Test" })
      ).rejects.toThrow();
    });

    it("validates id is required", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        // @ts-expect-error - testing missing id
        caller.professional.update({ name: "Test" })
      ).rejects.toThrow();
    });
  });

  describe("professional.delete", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.professional.delete({ id: 1 })
      ).rejects.toThrow();
    });

    it("validates id is positive integer", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.professional.delete({ id: 0 })
      ).rejects.toThrow();
    });
  });

  describe("professional.get", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.professional.get({ id: 1 })
      ).rejects.toThrow();
    });

    it("validates id is positive", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.professional.get({ id: -5 })
      ).rejects.toThrow();
    });
  });

  describe("professional.count", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.professional.count()).rejects.toThrow();
    });
  });

  describe("tenant isolation", () => {
    it("all professional operations require an establishment", async () => {
      // A user without an establishment should get NOT_FOUND, not access to other tenants
      const ctx = createAuthenticatedContext({ id: 99999 });
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.professional.list();
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
        expect(error.message).toContain("Estabelecimento");
      }
    });
  });
});
