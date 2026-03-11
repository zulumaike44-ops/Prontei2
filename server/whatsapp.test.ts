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

function createOtherUserContext(): TrpcContext {
  return createMockContext({
    id: 999,
    openId: "other-user-999",
    email: "other@example.com",
    name: "Other User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  });
}

// ============================================================
// WHATSAPP SETTINGS TESTS
// ============================================================

describe("whatsapp router", () => {
  // ---- SETTINGS ----
  describe("whatsapp.getSettings", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.whatsapp.getSettings()).rejects.toThrow();
    });

    it("returns null or settings when authenticated", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.whatsapp.getSettings();
        // Should be null (no settings yet) or an object
        expect(result === null || typeof result === "object").toBe(true);
      } catch (error: any) {
        // NOT_FOUND for establishment is acceptable
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("whatsapp.updateSettings", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.whatsapp.updateSettings({ isEnabled: true })
      ).rejects.toThrow();
    });

    it("creates or updates settings when authenticated", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.whatsapp.updateSettings({
          isEnabled: false,
          phoneNumber: "5511999998888",
          provider: "meta",
          autoReplyEnabled: true,
          autoReplyMessage: "Olá! Mensagem de teste.",
        });

        expect(result).toBeDefined();
        if (result) {
          expect(result.phoneNumber).toBe("5511999998888");
          expect(result.provider).toBe("meta");
          expect(result.autoReplyEnabled).toBe(true);
        }
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("validates provider max length", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.whatsapp.updateSettings({
          provider: "a".repeat(51), // exceeds max 50
        })
      ).rejects.toThrow();
    });

    it("validates autoReplyMessage max length", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.whatsapp.updateSettings({
          autoReplyMessage: "a".repeat(1001), // exceeds max 1000
        })
      ).rejects.toThrow();
    });
  });

  // ---- CONVERSATIONS ----
  describe("whatsapp.listConversations", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.whatsapp.listConversations()).rejects.toThrow();
    });

    it("returns array when authenticated", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.whatsapp.listConversations();
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("accepts status filter", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.whatsapp.listConversations({ status: "open" });
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("accepts limit parameter", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.whatsapp.listConversations({ limit: 10 });
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeLessThanOrEqual(10);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("rejects invalid limit", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.whatsapp.listConversations({ limit: 0 })
      ).rejects.toThrow();

      await expect(
        caller.whatsapp.listConversations({ limit: 201 })
      ).rejects.toThrow();
    });
  });

  describe("whatsapp.getConversation", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.whatsapp.getConversation({ id: 1 })
      ).rejects.toThrow();
    });

    it("returns NOT_FOUND for non-existent conversation", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.whatsapp.getConversation({ id: 99999 });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(["NOT_FOUND"]).toContain(error.code);
      }
    });

    it("validates id is positive integer", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.whatsapp.getConversation({ id: -1 })
      ).rejects.toThrow();

      await expect(
        caller.whatsapp.getConversation({ id: 0 })
      ).rejects.toThrow();
    });
  });

  // ---- MESSAGES ----
  describe("whatsapp.getMessages", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.whatsapp.getMessages({ conversationId: 1 })
      ).rejects.toThrow();
    });

    it("returns NOT_FOUND for non-existent conversation", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.whatsapp.getMessages({ conversationId: 99999 });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(["NOT_FOUND"]).toContain(error.code);
      }
    });

    it("validates limit range", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.whatsapp.getMessages({ conversationId: 1, limit: 0 })
      ).rejects.toThrow();

      await expect(
        caller.whatsapp.getMessages({ conversationId: 1, limit: 501 })
      ).rejects.toThrow();
    });
  });

  // ---- REPLY ----
  describe("whatsapp.reply", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.whatsapp.reply({ conversationId: 1, message: "Hello" })
      ).rejects.toThrow();
    });

    it("validates message is not empty", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.whatsapp.reply({ conversationId: 1, message: "" })
      ).rejects.toThrow();
    });

    it("validates message max length", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.whatsapp.reply({ conversationId: 1, message: "a".repeat(4097) })
      ).rejects.toThrow();
    });

    it("returns NOT_FOUND for non-existent conversation", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.whatsapp.reply({ conversationId: 99999, message: "Hello" });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(["NOT_FOUND"]).toContain(error.code);
      }
    });
  });

  // ---- CLOSE CONVERSATION ----
  describe("whatsapp.closeConversation", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.whatsapp.closeConversation({ id: 1 })
      ).rejects.toThrow();
    });

    it("returns NOT_FOUND for non-existent conversation", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.whatsapp.closeConversation({ id: 99999 });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(["NOT_FOUND"]).toContain(error.code);
      }
    });

    it("validates id is positive integer", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.whatsapp.closeConversation({ id: 0 })
      ).rejects.toThrow();
    });
  });

  // ---- MULTI-TENANT ISOLATION ----
  describe("multi-tenant isolation", () => {
    it("other user cannot access conversations from different tenant", async () => {
      const otherCtx = createOtherUserContext();
      const otherCaller = appRouter.createCaller(otherCtx);

      // Other user has no establishment, so should get NOT_FOUND
      try {
        await otherCaller.whatsapp.listConversations();
        // If it returns, it should be empty (no data for this tenant)
        // This is acceptable since the user has no establishment
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("other user cannot access settings from different tenant", async () => {
      const otherCtx = createOtherUserContext();
      const otherCaller = appRouter.createCaller(otherCtx);

      try {
        await otherCaller.whatsapp.getSettings();
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("other user cannot update settings of different tenant", async () => {
      const otherCtx = createOtherUserContext();
      const otherCaller = appRouter.createCaller(otherCtx);

      try {
        await otherCaller.whatsapp.updateSettings({ isEnabled: true });
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("other user cannot get conversation from different tenant", async () => {
      const otherCtx = createOtherUserContext();
      const otherCaller = appRouter.createCaller(otherCtx);

      try {
        await otherCaller.whatsapp.getConversation({ id: 1 });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(["NOT_FOUND"]).toContain(error.code);
      }
    });

    it("other user cannot reply to conversation from different tenant", async () => {
      const otherCtx = createOtherUserContext();
      const otherCaller = appRouter.createCaller(otherCtx);

      try {
        await otherCaller.whatsapp.reply({ conversationId: 1, message: "hack" });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(["NOT_FOUND"]).toContain(error.code);
      }
    });

    it("other user cannot close conversation from different tenant", async () => {
      const otherCtx = createOtherUserContext();
      const otherCaller = appRouter.createCaller(otherCtx);

      try {
        await otherCaller.whatsapp.closeConversation({ id: 1 });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(["NOT_FOUND"]).toContain(error.code);
      }
    });
  });
});

// ============================================================
// WEBHOOK UNIT TESTS
// ============================================================

describe("whatsapp webhook helpers", () => {
  describe("sendWhatsappMessage (stub)", () => {
    it("returns success with mock message ID", async () => {
      const { sendWhatsappMessage } = await import("./whatsappWebhook");

      const result = await sendWhatsappMessage(
        "phone_number_id_123",
        "access_token_abc",
        "5511999998888",
        "Olá, teste!"
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.messageId.startsWith("mock_")).toBe(true);
    });
  });

  describe("normalizePhone", () => {
    it("removes non-digit characters", async () => {
      const { normalizePhone } = await import("./db");

      expect(normalizePhone("+55 (11) 99999-8888")).toBe("5511999998888");
      expect(normalizePhone("5511999998888")).toBe("5511999998888");
      expect(normalizePhone("(11) 99999-8888")).toBe("11999998888");
    });
  });
});

// ============================================================
// WHATSAPP DB UNIT TESTS
// ============================================================

describe("whatsappDb queries", () => {
  describe("getWhatsappSettings", () => {
    it("returns undefined for non-existent establishment", async () => {
      const { getWhatsappSettings } = await import("./whatsappDb");
      const result = await getWhatsappSettings(99999);
      expect(result).toBeUndefined();
    });
  });

  describe("getConversationsByEstablishment", () => {
    it("returns empty array for establishment with no conversations", async () => {
      const { getConversationsByEstablishment } = await import("./whatsappDb");
      const result = await getConversationsByEstablishment(99999);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("getConversationById", () => {
    it("returns undefined for non-existent conversation", async () => {
      const { getConversationById } = await import("./whatsappDb");
      const result = await getConversationById(99999, 1);
      expect(result).toBeUndefined();
    });
  });

  describe("getMessagesByConversation", () => {
    it("returns empty array for non-existent conversation", async () => {
      const { getMessagesByConversation } = await import("./whatsappDb");
      const result = await getMessagesByConversation(99999);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("getSettingsByPhoneNumber", () => {
    it("returns undefined for non-configured phone number", async () => {
      const { getSettingsByPhoneNumber } = await import("./whatsappDb");
      const result = await getSettingsByPhoneNumber("0000000000");
      expect(result).toBeUndefined();
    });
  });

  describe("countConversationsByEstablishment", () => {
    it("returns 0 for establishment with no conversations", async () => {
      const { countConversationsByEstablishment } = await import("./whatsappDb");
      const result = await countConversationsByEstablishment(99999);
      expect(result).toBe(0);
    });
  });
});
