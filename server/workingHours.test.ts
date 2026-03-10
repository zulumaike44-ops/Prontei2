import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ============================================================
// HELPERS
// ============================================================

function createMockContext(userId: number): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `test-user-${userId}`,
      email: `user${userId}@test.com`,
      name: `Test User ${userId}`,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ============================================================
// WORKING HOURS ROUTER TESTS
// ============================================================

describe("workingHours router", () => {
  // ============================================================
  // VALIDATION TESTS (these don't need DB)
  // ============================================================

  describe("saveWeek input validation", () => {
    it("rejects schedule with invalid time format", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.workingHours.saveWeek({
          professionalId: 1,
          schedule: [
            {
              dayOfWeek: 1,
              startTime: "9:00", // invalid — must be HH:MM
              endTime: "18:00",
              isActive: true,
            },
          ],
        })
      ).rejects.toThrow();
    });

    it("rejects schedule with dayOfWeek out of range", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.workingHours.saveWeek({
          professionalId: 1,
          schedule: [
            {
              dayOfWeek: 7, // invalid — max is 6
              startTime: "09:00",
              endTime: "18:00",
              isActive: true,
            },
          ],
        })
      ).rejects.toThrow();
    });

    it("rejects schedule with negative dayOfWeek", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.workingHours.saveWeek({
          professionalId: 1,
          schedule: [
            {
              dayOfWeek: -1,
              startTime: "09:00",
              endTime: "18:00",
              isActive: true,
            },
          ],
        })
      ).rejects.toThrow();
    });

    it("rejects empty schedule array", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.workingHours.saveWeek({
          professionalId: 1,
          schedule: [],
        })
      ).rejects.toThrow();
    });

    it("rejects schedule with more than 7 entries", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      const schedule = Array.from({ length: 8 }, (_, i) => ({
        dayOfWeek: i % 7,
        startTime: "09:00",
        endTime: "18:00",
        isActive: true,
      }));

      await expect(
        caller.workingHours.saveWeek({
          professionalId: 1,
          schedule,
        })
      ).rejects.toThrow();
    });

    it("rejects invalid break time format", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.workingHours.saveWeek({
          professionalId: 1,
          schedule: [
            {
              dayOfWeek: 1,
              startTime: "09:00",
              endTime: "18:00",
              breakStart: "12", // invalid
              breakEnd: "13:00",
              isActive: true,
            },
          ],
        })
      ).rejects.toThrow();
    });

    it("accepts valid schedule with all 7 days", async () => {
      // This test validates the Zod schema accepts a well-formed input
      // The actual mutation will fail because no establishment for this user
      const ctx = createMockContext(99994);
      const caller = appRouter.createCaller(ctx);

      const validSchedule = Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: i >= 1 && i <= 5 ? "12:00" : null,
        breakEnd: i >= 1 && i <= 5 ? "13:00" : null,
        isActive: i >= 1 && i <= 5,
      }));

      // Will throw NOT_FOUND (no establishment) but NOT a validation error
      try {
        await caller.workingHours.saveWeek({
          professionalId: 1,
          schedule: validSchedule,
        });
        // If it resolves (user has establishment), that's also fine — Zod passed
      } catch (e: any) {
        // Should be a tenant error, not a Zod validation error
        expect(e.message).toContain("Estabelecimento não encontrado");
      }
    });

    it("accepts inactive days without time validation", async () => {
      const ctx = createMockContext(99998);
      const caller = appRouter.createCaller(ctx);

      // Inactive day with startTime > endTime should pass Zod validation
      // (will fail at tenant resolution, not at Zod)
      await expect(
        caller.workingHours.saveWeek({
          professionalId: 1,
          schedule: [
            {
              dayOfWeek: 0,
              startTime: "18:00",
              endTime: "09:00", // reversed but inactive
              isActive: false,
            },
          ],
        })
      ).rejects.toThrow("Estabelecimento não encontrado");
    });
  });

  describe("getByProfessional input validation", () => {
    it("rejects non-positive professionalId", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.workingHours.getByProfessional({ professionalId: 0 })
      ).rejects.toThrow();
    });

    it("rejects negative professionalId", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.workingHours.getByProfessional({ professionalId: -1 })
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // BUSINESS RULE TESTS (mock tenant resolution)
  // ============================================================

  describe("business rules", () => {
    it("requires authentication for getByProfessional", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: { clearCookie: () => {} } as TrpcContext["res"],
      };
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.workingHours.getByProfessional({ professionalId: 1 })
      ).rejects.toThrow();
    });

    it("requires authentication for saveWeek", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: { clearCookie: () => {} } as TrpcContext["res"],
      };
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.workingHours.saveWeek({
          professionalId: 1,
          schedule: [
            {
              dayOfWeek: 1,
              startTime: "09:00",
              endTime: "18:00",
              isActive: true,
            },
          ],
        })
      ).rejects.toThrow();
    });

    it("requires establishment (tenant) for getByProfessional", async () => {
      const ctx = createMockContext(99999); // user without establishment
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.workingHours.getByProfessional({ professionalId: 1 })
      ).rejects.toThrow("Estabelecimento não encontrado");
    });

    it("requires establishment (tenant) for saveWeek", async () => {
      const ctx = createMockContext(99999); // user without establishment
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.workingHours.saveWeek({
          professionalId: 1,
          schedule: [
            {
              dayOfWeek: 1,
              startTime: "09:00",
              endTime: "18:00",
              isActive: true,
            },
          ],
        })
      ).rejects.toThrow("Estabelecimento não encontrado");
    });
  });

  // ============================================================
  // SCHEDULE STRUCTURE TESTS
  // ============================================================

  describe("schedule structure", () => {
    it("accepts schedule with nullable break times", async () => {
      const ctx = createMockContext(99997);
      const caller = appRouter.createCaller(ctx);

      // Should pass Zod validation (will fail at tenant resolution)
      await expect(
        caller.workingHours.saveWeek({
          professionalId: 1,
          schedule: [
            {
              dayOfWeek: 1,
              startTime: "09:00",
              endTime: "18:00",
              breakStart: null,
              breakEnd: null,
              isActive: true,
            },
          ],
        })
      ).rejects.toThrow("Estabelecimento não encontrado");
    });

    it("accepts schedule without break fields (optional)", async () => {
      const ctx = createMockContext(99996);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.workingHours.saveWeek({
          professionalId: 1,
          schedule: [
            {
              dayOfWeek: 1,
              startTime: "09:00",
              endTime: "18:00",
              isActive: true,
            },
          ],
        })
      ).rejects.toThrow("Estabelecimento não encontrado");
    });

    it("accepts schedule with valid break times", async () => {
      const ctx = createMockContext(99995);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.workingHours.saveWeek({
          professionalId: 1,
          schedule: [
            {
              dayOfWeek: 1,
              startTime: "09:00",
              endTime: "18:00",
              breakStart: "12:00",
              breakEnd: "13:00",
              isActive: true,
            },
          ],
        })
      ).rejects.toThrow("Estabelecimento não encontrado");
    });
  });
});
