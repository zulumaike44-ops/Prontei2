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
// BLOCKED TIME ROUTER TESTS
// ============================================================

describe("blockedTime router", () => {
  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe("create input validation", () => {
    it("rejects empty title", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.create({
          title: "",
          startDatetime: "2026-04-01T09:00:00.000Z",
          endDatetime: "2026-04-01T17:00:00.000Z",
        })
      ).rejects.toThrow();
    });

    it("rejects title exceeding 200 characters", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.create({
          title: "A".repeat(201),
          startDatetime: "2026-04-01T09:00:00.000Z",
          endDatetime: "2026-04-01T17:00:00.000Z",
        })
      ).rejects.toThrow();
    });

    it("rejects empty startDatetime", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.create({
          title: "Férias",
          startDatetime: "",
          endDatetime: "2026-04-01T17:00:00.000Z",
        })
      ).rejects.toThrow();
    });

    it("rejects empty endDatetime", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.create({
          title: "Férias",
          startDatetime: "2026-04-01T09:00:00.000Z",
          endDatetime: "",
        })
      ).rejects.toThrow();
    });

    it("rejects negative professionalId", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.create({
          title: "Férias",
          professionalId: -1,
          startDatetime: "2026-04-01T09:00:00.000Z",
          endDatetime: "2026-04-01T17:00:00.000Z",
        })
      ).rejects.toThrow();
    });

    it("rejects reason exceeding 255 characters", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.create({
          title: "Férias",
          reason: "R".repeat(256),
          startDatetime: "2026-04-01T09:00:00.000Z",
          endDatetime: "2026-04-01T17:00:00.000Z",
        })
      ).rejects.toThrow();
    });
  });

  describe("update input validation", () => {
    it("rejects negative id", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.update({
          id: -1,
          title: "Updated",
        })
      ).rejects.toThrow();
    });

    it("rejects title exceeding 200 characters on update", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.update({
          id: 1,
          title: "A".repeat(201),
        })
      ).rejects.toThrow();
    });

    it("rejects empty title on update", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.update({
          id: 1,
          title: "",
        })
      ).rejects.toThrow();
    });
  });

  describe("delete input validation", () => {
    it("rejects negative id", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.delete({ id: -1 })
      ).rejects.toThrow();
    });

    it("rejects zero id", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.delete({ id: 0 })
      ).rejects.toThrow();
    });
  });

  describe("get input validation", () => {
    it("rejects negative id", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.get({ id: -1 })
      ).rejects.toThrow();
    });
  });

  describe("list input validation", () => {
    it("rejects negative professionalId in filter", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.list({ professionalId: -1 })
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // BUSINESS RULE TESTS (require DB — user 1 has establishment)
  // ============================================================

  describe("business rules (DB integration)", () => {
    it("rejects end datetime before start datetime", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.create({
          title: "Bloqueio inválido",
          startDatetime: "2026-04-01T17:00:00.000Z",
          endDatetime: "2026-04-01T09:00:00.000Z",
        })
      ).rejects.toThrow(/posterior/);
    });

    it("rejects end datetime equal to start datetime", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.create({
          title: "Bloqueio inválido",
          startDatetime: "2026-04-01T09:00:00.000Z",
          endDatetime: "2026-04-01T09:00:00.000Z",
        })
      ).rejects.toThrow(/posterior/);
    });

    it("creates a blocked time successfully", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.blockedTime.create({
        title: "Férias de teste",
        reason: "Viagem",
        startDatetime: "2026-06-01T00:00:00.000Z",
        endDatetime: "2026-06-15T23:59:59.000Z",
        isAllDay: true,
      });

      expect(result).toBeDefined();
      expect(result.title).toBe("Férias de teste");
      expect(result.reason).toBe("Viagem");
      expect(result.isAllDay).toBe(true);
      expect(result.isActive).toBe(true);
    });

    it("lists blocked times for the establishment", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      const list = await caller.blockedTime.list({ activeOnly: false });
      expect(Array.isArray(list)).toBe(true);
    });

    it("user without establishment cannot create blocked time", async () => {
      const ctx = createMockContext(99999);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.create({
          title: "Tentativa cross-tenant",
          startDatetime: "2026-04-01T09:00:00.000Z",
          endDatetime: "2026-04-01T17:00:00.000Z",
        })
      ).rejects.toThrow();
    });

    it("user without establishment cannot list blocked times", async () => {
      const ctx = createMockContext(99999);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.list()
      ).rejects.toThrow();
    });

    it("rejects get for non-existent blocked time", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.get({ id: 999999 })
      ).rejects.toThrow(/não encontrado/);
    });

    it("rejects update for non-existent blocked time", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.update({ id: 999999, title: "Nope" })
      ).rejects.toThrow(/não encontrado/);
    });

    it("rejects delete for non-existent blocked time", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blockedTime.delete({ id: 999999 })
      ).rejects.toThrow(/não encontrado/);
    });

    it("rejects create with professionalId from another tenant", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      // professionalId 999999 doesn't exist in this tenant
      await expect(
        caller.blockedTime.create({
          title: "Bloqueio cross-tenant",
          professionalId: 999999,
          startDatetime: "2026-04-01T09:00:00.000Z",
          endDatetime: "2026-04-01T17:00:00.000Z",
        })
      ).rejects.toThrow(/não encontrado/);
    });

    it("returns count of active blocked times", async () => {
      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.blockedTime.count();
      expect(typeof result.count).toBe("number");
      expect(result.count).toBeGreaterThanOrEqual(0);
    });
  });
});
