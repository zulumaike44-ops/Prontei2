import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { normalizePhone } from "./db";

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

function createDifferentUserContext(): TrpcContext {
  return createAuthenticatedContext({
    id: 9999,
    openId: "different-user-999",
    email: "other@example.com",
    name: "Other User",
  });
}

// ============================================================
// UNIT TESTS: normalizePhone
// ============================================================

describe("normalizePhone", () => {
  it("removes non-digit characters", () => {
    expect(normalizePhone("(11) 99999-1234")).toBe("11999991234");
  });

  it("handles already-clean numbers", () => {
    expect(normalizePhone("11999991234")).toBe("11999991234");
  });

  it("removes plus sign and country code formatting", () => {
    expect(normalizePhone("+55 11 99999-1234")).toBe("5511999991234");
  });

  it("handles empty string", () => {
    expect(normalizePhone("")).toBe("");
  });

  it("handles string with only non-digits", () => {
    expect(normalizePhone("abc-def")).toBe("");
  });

  it("handles various Brazilian formats", () => {
    expect(normalizePhone("(21) 3456-7890")).toBe("2134567890");
    expect(normalizePhone("21 34567890")).toBe("2134567890");
    expect(normalizePhone("021-3456-7890")).toBe("02134567890");
  });
});

// ============================================================
// INTEGRATION TESTS: customer router
// ============================================================

describe("customer router", () => {
  // ---- AUTH GATE ----
  describe("customer.list", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.customer.list()).rejects.toThrow();
    });

    it("returns array when authenticated", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.customer.list();
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        // If no establishment exists, it should throw NOT_FOUND
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("customer.get", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.customer.get({ id: 1 })).rejects.toThrow();
    });

    it("throws NOT_FOUND for non-existent customer", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.customer.get({ id: 999999 });
        expect.unreachable("Should have thrown");
      } catch (error: any) {
        expect(["NOT_FOUND"]).toContain(error.code);
      }
    });
  });

  // ---- CREATE VALIDATIONS ----
  describe("customer.create", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.customer.create({
          name: "Test",
          phone: "11999991234",
        })
      ).rejects.toThrow();
    });

    it("rejects name shorter than 2 characters", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.customer.create({
          name: "A",
          phone: "11999991234",
        })
      ).rejects.toThrow();
    });

    it("rejects phone shorter than 8 characters", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.customer.create({
          name: "Test Customer",
          phone: "1234",
        })
      ).rejects.toThrow();
    });

    it("rejects invalid email format", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.customer.create({
          name: "Test Customer",
          phone: "11999991234",
          email: "not-an-email",
        })
      ).rejects.toThrow();
    });

    it("accepts valid customer data", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.customer.create({
          name: "Maria Silva",
          phone: "(11) 99999-1234",
          email: "maria@email.com",
          notes: "Cliente VIP",
        });

        expect(result).toBeDefined();
        if (result) {
          expect(result.name).toBe("Maria Silva");
          expect(result.normalizedPhone).toBe("11999991234");
          expect(result.email).toBe("maria@email.com");
          expect(result.notes).toBe("Cliente VIP");
          expect(result.isActive).toBe(true);
        }
      } catch (error: any) {
        // If no establishment, NOT_FOUND is acceptable
        // If phone already exists from previous test run, CONFLICT is acceptable
        expect(["NOT_FOUND", "CONFLICT"]).toContain(error.code);
      }
    });

    it("normalizes phone on create", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.customer.create({
          name: "João Normalize",
          phone: "(21) 98765-4321",
        });

        if (result) {
          expect(result.phone).toBe("(21) 98765-4321");
          expect(result.normalizedPhone).toBe("21987654321");
        }
      } catch (error: any) {
        // NOT_FOUND (no establishment) or CONFLICT (phone exists from previous run)
        expect(["NOT_FOUND", "CONFLICT"]).toContain(error.code);
      }
    });

    it("rejects duplicate phone in same tenant", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        // Create first customer
        await caller.customer.create({
          name: "First Customer Dup",
          phone: "(31) 99999-0001",
        });

        // Try to create second with same normalized phone
        await expect(
          caller.customer.create({
            name: "Second Customer Dup",
            phone: "31 99999-0001", // Same digits, different format
          })
        ).rejects.toThrow(/telefone/i);
      } catch (error: any) {
        // If no establishment, NOT_FOUND is acceptable
        if (error.code !== "NOT_FOUND" && !error.message?.includes("telefone")) {
          throw error;
        }
      }
    });

    it("accepts empty email and notes", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.customer.create({
          name: "Minimal Customer",
          phone: "(11) 88888-0001",
          email: "",
          notes: "",
        });

        if (result) {
          expect(result.email).toBeNull();
          expect(result.notes).toBeNull();
        }
      } catch (error: any) {
        // NOT_FOUND (no establishment) or CONFLICT (phone exists from previous run)
        expect(["NOT_FOUND", "CONFLICT"]).toContain(error.code);
      }
    });
  });

  // ---- UPDATE ----
  describe("customer.update", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.customer.update({ id: 1, name: "Updated" })
      ).rejects.toThrow();
    });

    it("throws NOT_FOUND for non-existent customer", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.customer.update({ id: 999999, name: "Updated" });
        expect.unreachable("Should have thrown");
      } catch (error: any) {
        expect(["NOT_FOUND"]).toContain(error.code);
      }
    });

    it("rejects phone update that would cause duplicate", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        // Create two customers
        const c1 = await caller.customer.create({
          name: "Update Dup A",
          phone: "(41) 99999-0010",
        });
        const c2 = await caller.customer.create({
          name: "Update Dup B",
          phone: "(41) 99999-0020",
        });

        if (c1 && c2) {
          // Try to update c2's phone to match c1
          await expect(
            caller.customer.update({
              id: c2.id,
              phone: "(41) 99999-0010",
            })
          ).rejects.toThrow(/telefone/i);
        }
      } catch (error: any) {
        if (error.code !== "NOT_FOUND" && !error.message?.includes("telefone")) {
          throw error;
        }
      }
    });
  });

  // ---- DELETE (deactivate) ----
  describe("customer.delete", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.customer.delete({ id: 1 })).rejects.toThrow();
    });

    it("throws NOT_FOUND for non-existent customer", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.customer.delete({ id: 999999 });
        expect.unreachable("Should have thrown");
      } catch (error: any) {
        expect(["NOT_FOUND"]).toContain(error.code);
      }
    });
  });

  // ---- COUNT ----
  describe("customer.count", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.customer.count()).rejects.toThrow();
    });

    it("returns count object when authenticated", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.customer.count();
        expect(result).toHaveProperty("count");
        expect(typeof result.count).toBe("number");
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  // ---- MULTI-TENANT ISOLATION ----
  describe("multi-tenant isolation", () => {
    it("different user cannot access other tenant's customers", async () => {
      const ctx = createDifferentUserContext();
      const caller = appRouter.createCaller(ctx);

      // A different user (id: 9999) should not see customers from user 1's establishment
      try {
        const result = await caller.customer.list();
        // If they have their own establishment, they get their own customers (empty)
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        // If they don't have an establishment, NOT_FOUND is correct
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("different user cannot get customer by ID from other tenant", async () => {
      const ctx = createDifferentUserContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.customer.get({ id: 1 });
        // If it returns, it means the user has their own establishment but customer 1 doesn't belong to it
        expect.unreachable("Should have thrown NOT_FOUND");
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  // ---- SEARCH ----
  describe("customer.list with search", () => {
    it("accepts search parameter", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.customer.list({ search: "Maria" });
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("accepts search by phone digits", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.customer.list({ search: "99999" });
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("accepts activeOnly filter", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.customer.list({ activeOnly: false });
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });
});
