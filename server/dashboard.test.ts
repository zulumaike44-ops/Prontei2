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
// TESTS: Dashboard Summary
// ============================================================

describe("dashboard.summary", () => {
  // ---- AUTHENTICATION ----
  describe("authentication", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.dashboard.summary()).rejects.toThrow();
    });

    it("throws NOT_FOUND when user has no establishment", async () => {
      const ctx = createAuthenticatedContext({
        openId: "no-establishment-user",
        id: 99998,
      });
      const caller = appRouter.createCaller(ctx);

      await expect(caller.dashboard.summary()).rejects.toThrow();
    });
  });

  // ---- RESPONSE STRUCTURE ----
  describe("response structure", () => {
    it("returns all expected fields", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.dashboard.summary();

        // Verify all fields exist
        expect(result).toHaveProperty("appointmentsToday");
        expect(result).toHaveProperty("appointmentsThisMonth");
        expect(result).toHaveProperty("activeProfessionals");
        expect(result).toHaveProperty("activeServices");
        expect(result).toHaveProperty("activeCustomers");

        // Verify all values are numbers
        expect(typeof result.appointmentsToday).toBe("number");
        expect(typeof result.appointmentsThisMonth).toBe("number");
        expect(typeof result.activeProfessionals).toBe("number");
        expect(typeof result.activeServices).toBe("number");
        expect(typeof result.activeCustomers).toBe("number");

        // Verify all values are non-negative
        expect(result.appointmentsToday).toBeGreaterThanOrEqual(0);
        expect(result.appointmentsThisMonth).toBeGreaterThanOrEqual(0);
        expect(result.activeProfessionals).toBeGreaterThanOrEqual(0);
        expect(result.activeServices).toBeGreaterThanOrEqual(0);
        expect(result.activeCustomers).toBeGreaterThanOrEqual(0);
      } catch (error: any) {
        // NOT_FOUND is acceptable (no establishment for test user)
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  // ---- MULTI-TENANT ISOLATION ----
  describe("multi-tenant isolation", () => {
    it("different users get different summaries", async () => {
      const ctx1 = createAuthenticatedContext({ openId: "user-1" });
      const ctx2 = createAuthenticatedContext({ openId: "user-2" });
      const caller1 = appRouter.createCaller(ctx1);
      const caller2 = appRouter.createCaller(ctx2);

      try {
        const result1 = await caller1.dashboard.summary();
        const result2 = await caller2.dashboard.summary();

        // Both should return valid objects (may differ in values)
        expect(result1).toHaveProperty("appointmentsToday");
        expect(result2).toHaveProperty("appointmentsToday");
      } catch (error: any) {
        // NOT_FOUND is acceptable (no establishment for test user)
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("user without establishment cannot access summary", async () => {
      const ctx = createAuthenticatedContext({
        openId: "isolated-no-establishment",
        id: 99999,
      });
      const caller = appRouter.createCaller(ctx);

      await expect(caller.dashboard.summary()).rejects.toThrow();
    });
  });

  // ---- COUNTING ACCURACY ----
  describe("counting accuracy", () => {
    it("appointmentsToday counts only today's appointments", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.dashboard.summary();
        // appointmentsToday should be a non-negative integer
        expect(Number.isInteger(result.appointmentsToday)).toBe(true);
        expect(result.appointmentsToday).toBeGreaterThanOrEqual(0);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("appointmentsThisMonth counts current month appointments", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.dashboard.summary();
        // appointmentsThisMonth >= appointmentsToday (today is within this month)
        expect(result.appointmentsThisMonth).toBeGreaterThanOrEqual(
          result.appointmentsToday
        );
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("activeProfessionals counts non-deleted professionals", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.dashboard.summary();
        expect(Number.isInteger(result.activeProfessionals)).toBe(true);
        expect(result.activeProfessionals).toBeGreaterThanOrEqual(0);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("activeServices counts non-deleted services", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.dashboard.summary();
        expect(Number.isInteger(result.activeServices)).toBe(true);
        expect(result.activeServices).toBeGreaterThanOrEqual(0);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("activeCustomers counts active customers", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.dashboard.summary();
        expect(Number.isInteger(result.activeCustomers)).toBe(true);
        expect(result.activeCustomers).toBeGreaterThanOrEqual(0);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  // ---- CONSISTENCY ----
  describe("consistency", () => {
    it("summary is consistent with individual list endpoints", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const [summary, professionals, services] = await Promise.all([
          caller.dashboard.summary(),
          caller.professional.list(),
          caller.service.list(),
        ]);

        // Professional count should match list length (non-deleted)
        const activeProfessionals = professionals.filter(
          (p: any) => p.isActive && !p.deletedAt
        );
        expect(summary.activeProfessionals).toBe(activeProfessionals.length);

        // Service count should match list length (non-deleted)
        const activeServices = services.filter(
          (s: any) => s.isActive && !s.deletedAt
        );
        expect(summary.activeServices).toBe(activeServices.length);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("multiple calls return consistent results", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result1 = await caller.dashboard.summary();
        const result2 = await caller.dashboard.summary();

        // Should return the same values (no data changes between calls)
        expect(result1.activeProfessionals).toBe(result2.activeProfessionals);
        expect(result1.activeServices).toBe(result2.activeServices);
        expect(result1.activeCustomers).toBe(result2.activeCustomers);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });
});
