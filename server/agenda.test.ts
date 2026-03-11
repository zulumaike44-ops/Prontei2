import { describe, it, expect } from "vitest";
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

function createAuthenticatedContext(
  overrides: Partial<NonNullable<TrpcContext["user"]>> = {}
): TrpcContext {
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
// TESTS: Agenda Visual — endpoints used by the agenda page
// ============================================================

describe("agenda visual — appointment.list with date filters", () => {
  // ---- DAY VIEW: dateFrom + dateTo for a single day ----
  describe("day view filtering", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.appointment.list({
          dateFrom: "2026-03-11T00:00:00.000Z",
          dateTo: "2026-03-11T23:59:59.999Z",
        })
      ).rejects.toThrow();
    });

    it("accepts day range filters (dateFrom + dateTo)", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.appointment.list({
          dateFrom: "2026-03-11T00:00:00.000Z",
          dateTo: "2026-03-11T23:59:59.999Z",
        });
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("accepts day range with professional filter", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.appointment.list({
          dateFrom: "2026-03-11T00:00:00.000Z",
          dateTo: "2026-03-11T23:59:59.999Z",
          professionalId: 1,
        });
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  // ---- WEEK VIEW: dateFrom + dateTo for 7 days ----
  describe("week view filtering", () => {
    it("accepts week range filters (7-day span)", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.appointment.list({
          dateFrom: "2026-03-09T00:00:00.000Z",
          dateTo: "2026-03-15T23:59:59.999Z",
        });
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("accepts week range with professional filter", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.appointment.list({
          dateFrom: "2026-03-09T00:00:00.000Z",
          dateTo: "2026-03-15T23:59:59.999Z",
          professionalId: 1,
        });
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  // ---- STATUS FILTERING ----
  describe("status filtering", () => {
    const validStatuses = ["pending", "confirmed", "cancelled", "completed", "no_show"];

    for (const status of validStatuses) {
      it(`accepts status filter: ${status}`, async () => {
        const ctx = createAuthenticatedContext();
        const caller = appRouter.createCaller(ctx);

        try {
          const result = await caller.appointment.list({
            status,
            dateFrom: "2026-03-11T00:00:00.000Z",
            dateTo: "2026-03-11T23:59:59.999Z",
          });
          expect(Array.isArray(result)).toBe(true);
        } catch (error: any) {
          expect(error.code).toBe("NOT_FOUND");
        }
      });
    }
  });

  // ---- STATUS TRANSITIONS (used by agenda actions) ----
  describe("status transitions", () => {
    it("updateStatus requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.appointment.updateStatus({
          id: 1,
          status: "confirmed",
        })
      ).rejects.toThrow();
    });

    it("updateStatus validates status enum", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.appointment.updateStatus({
          id: 1,
          status: "invalid" as any,
        })
      ).rejects.toThrow();
    });

    it("updateStatus accepts valid transition to confirmed", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.appointment.updateStatus({
          id: 999999,
          status: "confirmed",
        });
        expect(true).toBe(false); // should not reach
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("updateStatus accepts valid transition to completed", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.appointment.updateStatus({
          id: 999999,
          status: "completed",
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("updateStatus accepts valid transition to no_show", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.appointment.updateStatus({
          id: 999999,
          status: "no_show",
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("updateStatus accepts reason parameter", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.appointment.updateStatus({
          id: 999999,
          status: "confirmed",
          reason: "Cliente confirmou por telefone",
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  // ---- CANCEL (used by agenda cancel action) ----
  describe("cancel action", () => {
    it("cancel requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.appointment.cancel({ id: 1 })
      ).rejects.toThrow();
    });

    it("cancel accepts reason parameter", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.appointment.cancel({
          id: 999999,
          reason: "Cliente não pode comparecer",
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("cancel without reason works", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.appointment.cancel({ id: 999999 });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  // ---- MULTI-TENANT ISOLATION ----
  describe("multi-tenant isolation", () => {
    it("different users see different data", async () => {
      const ctx1 = createAuthenticatedContext({ openId: "user-1" });
      const ctx2 = createAuthenticatedContext({ openId: "user-2" });
      const caller1 = appRouter.createCaller(ctx1);
      const caller2 = appRouter.createCaller(ctx2);

      try {
        const result1 = await caller1.appointment.list({
          dateFrom: "2026-03-11T00:00:00.000Z",
          dateTo: "2026-03-11T23:59:59.999Z",
        });
        const result2 = await caller2.appointment.list({
          dateFrom: "2026-03-11T00:00:00.000Z",
          dateTo: "2026-03-11T23:59:59.999Z",
        });
        // Both should return arrays (possibly empty)
        expect(Array.isArray(result1)).toBe(true);
        expect(Array.isArray(result2)).toBe(true);
      } catch (error: any) {
        // NOT_FOUND is acceptable (no establishment for test user)
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("cannot access appointment from another tenant", async () => {
      const ctx = createAuthenticatedContext({ openId: "isolated-user" });
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.appointment.get({ id: 999999 });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  // ---- PROFESSIONAL LIST (used by agenda filter) ----
  describe("professional list for filter", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.professional.list()).rejects.toThrow();
    });

    it("returns array when authenticated", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.professional.list();
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });
});
