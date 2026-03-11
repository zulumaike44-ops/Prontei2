import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  timeToMinutes,
  minutesToTime,
  hasOverlap,
  hasDateOverlap,
} from "./availability";

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
// UNIT TESTS: timeToMinutes / minutesToTime
// ============================================================

describe("availability helpers", () => {
  describe("timeToMinutes", () => {
    it("converts 00:00 to 0", () => {
      expect(timeToMinutes("00:00")).toBe(0);
    });

    it("converts 08:30 to 510", () => {
      expect(timeToMinutes("08:30")).toBe(510);
    });

    it("converts 12:00 to 720", () => {
      expect(timeToMinutes("12:00")).toBe(720);
    });

    it("converts 23:59 to 1439", () => {
      expect(timeToMinutes("23:59")).toBe(1439);
    });

    it("converts 18:00 to 1080", () => {
      expect(timeToMinutes("18:00")).toBe(1080);
    });
  });

  describe("minutesToTime", () => {
    it("converts 0 to 00:00", () => {
      expect(minutesToTime(0)).toBe("00:00");
    });

    it("converts 510 to 08:30", () => {
      expect(minutesToTime(510)).toBe("08:30");
    });

    it("converts 720 to 12:00", () => {
      expect(minutesToTime(720)).toBe("12:00");
    });

    it("converts 1439 to 23:59", () => {
      expect(minutesToTime(1439)).toBe("23:59");
    });

    it("converts 1080 to 18:00", () => {
      expect(minutesToTime(1080)).toBe("18:00");
    });
  });

  describe("roundtrip timeToMinutes <-> minutesToTime", () => {
    it("roundtrips 09:15", () => {
      expect(minutesToTime(timeToMinutes("09:15"))).toBe("09:15");
    });

    it("roundtrips 14:40", () => {
      expect(minutesToTime(timeToMinutes("14:40"))).toBe("14:40");
    });
  });
});

// ============================================================
// UNIT TESTS: hasOverlap (minutes-based)
// ============================================================

describe("hasOverlap (minutes)", () => {
  it("detects full overlap", () => {
    // Existing: 10:00-11:00, New: 10:00-11:00
    expect(hasOverlap(600, 660, 600, 660)).toBe(true);
  });

  it("detects partial overlap at start", () => {
    // Existing: 10:00-11:00, New: 10:30-11:30
    expect(hasOverlap(600, 660, 630, 690)).toBe(true);
  });

  it("detects partial overlap at end", () => {
    // Existing: 10:00-11:00, New: 09:30-10:30
    expect(hasOverlap(600, 660, 570, 630)).toBe(true);
  });

  it("detects containment (new inside existing)", () => {
    // Existing: 09:00-12:00, New: 10:00-11:00
    expect(hasOverlap(540, 720, 600, 660)).toBe(true);
  });

  it("detects containment (existing inside new)", () => {
    // Existing: 10:00-11:00, New: 09:00-12:00
    expect(hasOverlap(600, 660, 540, 720)).toBe(true);
  });

  it("no overlap when adjacent (end touches start)", () => {
    // Existing: 10:00-11:00, New: 11:00-12:00
    expect(hasOverlap(600, 660, 660, 720)).toBe(false);
  });

  it("no overlap when adjacent (start touches end)", () => {
    // Existing: 11:00-12:00, New: 10:00-11:00
    expect(hasOverlap(660, 720, 600, 660)).toBe(false);
  });

  it("no overlap when completely separate", () => {
    // Existing: 08:00-09:00, New: 14:00-15:00
    expect(hasOverlap(480, 540, 840, 900)).toBe(false);
  });

  it("no overlap when completely separate (reversed)", () => {
    // Existing: 14:00-15:00, New: 08:00-09:00
    expect(hasOverlap(840, 900, 480, 540)).toBe(false);
  });
});

// ============================================================
// UNIT TESTS: hasDateOverlap
// ============================================================

describe("hasDateOverlap", () => {
  it("detects overlapping date ranges", () => {
    const a1 = new Date("2026-03-10T10:00:00");
    const a2 = new Date("2026-03-10T11:00:00");
    const b1 = new Date("2026-03-10T10:30:00");
    const b2 = new Date("2026-03-10T11:30:00");
    expect(hasDateOverlap(a1, a2, b1, b2)).toBe(true);
  });

  it("no overlap for adjacent date ranges", () => {
    const a1 = new Date("2026-03-10T10:00:00");
    const a2 = new Date("2026-03-10T11:00:00");
    const b1 = new Date("2026-03-10T11:00:00");
    const b2 = new Date("2026-03-10T12:00:00");
    expect(hasDateOverlap(a1, a2, b1, b2)).toBe(false);
  });

  it("no overlap for completely separate date ranges", () => {
    const a1 = new Date("2026-03-10T08:00:00");
    const a2 = new Date("2026-03-10T09:00:00");
    const b1 = new Date("2026-03-10T14:00:00");
    const b2 = new Date("2026-03-10T15:00:00");
    expect(hasDateOverlap(a1, a2, b1, b2)).toBe(false);
  });

  it("detects containment", () => {
    const a1 = new Date("2026-03-10T09:00:00");
    const a2 = new Date("2026-03-10T17:00:00");
    const b1 = new Date("2026-03-10T10:00:00");
    const b2 = new Date("2026-03-10T11:00:00");
    expect(hasDateOverlap(a1, a2, b1, b2)).toBe(true);
  });

  it("detects overlap across days", () => {
    const a1 = new Date("2026-03-10T22:00:00");
    const a2 = new Date("2026-03-11T02:00:00");
    const b1 = new Date("2026-03-10T23:00:00");
    const b2 = new Date("2026-03-11T01:00:00");
    expect(hasDateOverlap(a1, a2, b1, b2)).toBe(true);
  });
});

// ============================================================
// INTEGRATION TESTS: appointment tRPC routes
// ============================================================

describe("appointment router", () => {
  describe("appointment.list", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.appointment.list()).rejects.toThrow();
    });

    it("returns array or throws NOT_FOUND when authenticated", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.appointment.list();
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("accepts date filters", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.appointment.list({
          dateFrom: "2026-03-10T00:00:00Z",
          dateTo: "2026-03-10T23:59:59Z",
        });
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("accepts status filter", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.appointment.list({
          status: "pending",
        });
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("appointment.get", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.appointment.get({ id: 1 })).rejects.toThrow();
    });

    it("throws NOT_FOUND for non-existent appointment", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.appointment.get({ id: 999999 });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("appointment.create", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.appointment.create({
          professionalId: 1,
          serviceId: 1,
          customerId: 1,
          startDatetime: new Date().toISOString(),
        })
      ).rejects.toThrow();
    });

    it("validates input with Zod", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      // Invalid: missing required fields
      await expect(
        caller.appointment.create({
          professionalId: 0, // invalid: not positive
          serviceId: 1,
          customerId: 1,
          startDatetime: new Date().toISOString(),
        })
      ).rejects.toThrow();
    });

    it("validates professionalId is positive", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.appointment.create({
          professionalId: -1,
          serviceId: 1,
          customerId: 1,
          startDatetime: new Date().toISOString(),
        })
      ).rejects.toThrow();
    });
  });

  describe("appointment.updateStatus", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.appointment.updateStatus({
          id: 1,
          status: "confirmed",
        })
      ).rejects.toThrow();
    });

    it("validates status enum", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.appointment.updateStatus({
          id: 1,
          status: "invalid_status" as any,
        })
      ).rejects.toThrow();
    });

    it("accepts valid status values", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      // Should throw NOT_FOUND (appointment doesn't exist), not validation error
      try {
        await caller.appointment.updateStatus({
          id: 999999,
          status: "confirmed",
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("appointment.cancel", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.appointment.cancel({ id: 1 })
      ).rejects.toThrow();
    });

    it("throws NOT_FOUND for non-existent appointment", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.appointment.cancel({ id: 999999 });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("accepts optional reason", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.appointment.cancel({
          id: 999999,
          reason: "Cliente solicitou cancelamento",
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("appointment.count", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.appointment.count()).rejects.toThrow();
    });

    it("returns count object when authenticated", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.appointment.count();
        expect(result).toHaveProperty("count");
        expect(typeof result.count).toBe("number");
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("accepts optional filters", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.appointment.count({
          status: "pending",
          dateFrom: "2026-03-01T00:00:00Z",
          dateTo: "2026-03-31T23:59:59Z",
        });
        expect(result).toHaveProperty("count");
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });
});

// ============================================================
// INTEGRATION TESTS: availability tRPC routes
// ============================================================

describe("availability router", () => {
  describe("availability.getSlots", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.availability.getSlots({
          professionalId: 1,
          serviceId: 1,
          date: "2026-03-15",
        })
      ).rejects.toThrow();
    });

    it("validates date format", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.availability.getSlots({
          professionalId: 1,
          serviceId: 1,
          date: "invalid-date",
        })
      ).rejects.toThrow();
    });

    it("validates date format requires YYYY-MM-DD", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.availability.getSlots({
          professionalId: 1,
          serviceId: 1,
          date: "15/03/2026",
        })
      ).rejects.toThrow();
    });

    it("validates professionalId is positive", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.availability.getSlots({
          professionalId: 0,
          serviceId: 1,
          date: "2026-03-15",
        })
      ).rejects.toThrow();
    });

    it("validates serviceId is positive", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.availability.getSlots({
          professionalId: 1,
          serviceId: -1,
          date: "2026-03-15",
        })
      ).rejects.toThrow();
    });

    it("returns slots structure when valid input", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.availability.getSlots({
          professionalId: 1,
          serviceId: 1,
          date: "2026-03-15",
        });
        expect(result).toHaveProperty("slots");
        expect(result).toHaveProperty("durationMinutes");
        expect(result).toHaveProperty("effectivePrice");
        expect(Array.isArray(result.slots)).toBe(true);
      } catch (error: any) {
        // NOT_FOUND is acceptable (no establishment or professional)
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });
});
