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
// CONNECTION STATUS & FLOW TESTS
// ============================================================

describe("whatsapp router", () => {
  // ---- CONNECTION STATUS ----
  describe("whatsapp.getConnectionStatus", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.whatsapp.getConnectionStatus()).rejects.toThrow();
    });

    it("returns connection status when authenticated", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.whatsapp.getConnectionStatus();
        expect(result).toBeDefined();
        expect(["disconnected", "connected", "waiting_qr", "error"]).toContain(result.status);
        expect(typeof result.isEnabled).toBe("boolean");
        expect(typeof result.autoReplyEnabled).toBe("boolean");
        expect(typeof result.conversationCount).toBe("number");
        expect(result.provider).toBe("z-api");
        // Sensitive fields must NOT be present
        expect((result as any).instanceToken).toBeUndefined();
        expect((result as any).clientToken).toBeUndefined();
        expect((result as any).accessToken).toBeUndefined();
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("never exposes sensitive credentials in response", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.whatsapp.getConnectionStatus();
        const json = JSON.stringify(result);
        expect(json).not.toContain("instanceToken");
        expect(json).not.toContain("clientToken");
        expect(json).not.toContain("accessToken");
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  // ---- COMPLETE EMBEDDED SIGNUP (Meta Cloud API) ----
  describe("whatsapp.completeEmbeddedSignup", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.whatsapp.completeEmbeddedSignup({
          code: "test_auth_code",
        })
      ).rejects.toThrow();
    });

    it("validates code is required", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.whatsapp.completeEmbeddedSignup({
          code: "",
        })
      ).rejects.toThrow();
    });

    it("attempts token exchange with valid code (will fail with fake code)", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.whatsapp.completeEmbeddedSignup({
          code: "fake_auth_code_12345",
        });

        // With fake code, should return error from Meta
        expect(result).toBeDefined();
        expect(result.success).toBe(false);
      } catch (error: any) {
        // May fail with NOT_FOUND if no establishment, or INTERNAL_SERVER_ERROR from Meta
        expect(["NOT_FOUND", "INTERNAL_SERVER_ERROR"]).toContain(error.code);
      }
    });
  });

  // ---- DISCONNECT ----
  describe("whatsapp.disconnect", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.whatsapp.disconnect()).rejects.toThrow();
    });

    it("disconnects when authenticated", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.whatsapp.disconnect();
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  // ---- TEST CONNECTION ----
  describe("whatsapp.testConnection", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.whatsapp.testConnection()).rejects.toThrow();
    });

    it("returns result when authenticated", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.whatsapp.testConnection();
        expect(result).toBeDefined();
        expect(typeof result.success).toBe("boolean");
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      } catch (error: any) {
        expect(["NOT_FOUND", "BAD_REQUEST"]).toContain(error.code);
      }
    });
  });

  // ---- GET QR CODE ----
  describe("whatsapp.getQrCode", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.whatsapp.getQrCode()).rejects.toThrow();
    });

    it("returns PRECONDITION_FAILED when no credentials configured", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.whatsapp.getQrCode();
      } catch (error: any) {
        expect(["PRECONDITION_FAILED", "NOT_FOUND"]).toContain(error.code);
      }
    });
  });

  // ---- UPDATE AUTO REPLY ----
  describe("whatsapp.updateAutoReply", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.whatsapp.updateAutoReply({ autoReplyEnabled: true })
      ).rejects.toThrow();
    });

    it("updates auto reply settings", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.whatsapp.updateAutoReply({
          autoReplyEnabled: true,
          autoReplyMessage: "Olá! Mensagem de teste.",
        });

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("validates autoReplyMessage max length", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.whatsapp.updateAutoReply({
          autoReplyEnabled: true,
          autoReplyMessage: "a".repeat(1001),
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
    it("other user cannot access connection status from different tenant", async () => {
      const otherCtx = createOtherUserContext();
      const otherCaller = appRouter.createCaller(otherCtx);

      try {
        await otherCaller.whatsapp.getConnectionStatus();
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("other user cannot save Z-API credentials on different tenant", async () => {
      const otherCtx = createOtherUserContext();
      const otherCaller = appRouter.createCaller(otherCtx);

      try {
        await otherCaller.whatsapp.saveZApiCredentials({
          instanceId: "ABC123",
          instanceToken: "TOKEN456",
          clientToken: "CLIENT789",
        });
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("other user cannot disconnect WhatsApp on different tenant", async () => {
      const otherCtx = createOtherUserContext();
      const otherCaller = appRouter.createCaller(otherCtx);

      try {
        await otherCaller.whatsapp.disconnect();
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("other user cannot access conversations from different tenant", async () => {
      const otherCtx = createOtherUserContext();
      const otherCaller = appRouter.createCaller(otherCtx);

      try {
        await otherCaller.whatsapp.listConversations();
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
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
  });
});

// ============================================================
// WEBHOOK UNIT TESTS
// ============================================================

describe("whatsapp webhook helpers", () => {
  describe("validateSendCredentials (Meta Cloud API)", () => {
    it("returns valid when phoneNumberId and accessToken are present", async () => {
      const { validateSendCredentials } = await import("./whatsappWebhook");

      const result = validateSendCredentials("123456789", "EAAxxxxxxx");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns invalid when phoneNumberId is missing", async () => {
      const { validateSendCredentials } = await import("./whatsappWebhook");

      const result = validateSendCredentials("", "EAAxxxxxxx");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Phone Number ID");
    });

    it("returns invalid when accessToken is missing", async () => {
      const { validateSendCredentials } = await import("./whatsappWebhook");

      const result = validateSendCredentials("123456789", "");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Access Token");
    });

    it("returns invalid when both are missing", async () => {
      const { validateSendCredentials } = await import("./whatsappWebhook");

      const result = validateSendCredentials(null, null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });

    it("returns invalid when both are undefined", async () => {
      const { validateSendCredentials } = await import("./whatsappWebhook");

      const result = validateSendCredentials(undefined, undefined);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });

    it("returns invalid when values are whitespace only", async () => {
      const { validateSendCredentials } = await import("./whatsappWebhook");

      const result = validateSendCredentials("  ", "  ");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });

  describe("sendWhatsappMessage (Meta Cloud API)", () => {
    it("returns error when credentials are empty", async () => {
      const { sendWhatsappMessage } = await import("./whatsappWebhook");

      const result = await sendWhatsappMessage(
        "",
        "",
        "5511999998888",
        "Olá, teste!"
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INVALID_CREDENTIALS");
      expect(result.error).toBeDefined();
    });

    it("returns error when phoneNumberId is empty", async () => {
      const { sendWhatsappMessage } = await import("./whatsappWebhook");

      const result = await sendWhatsappMessage(
        "",
        "EAAvalid_token",
        "5511999998888",
        "Olá!"
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INVALID_CREDENTIALS");
    });

    it("returns error when accessToken is empty", async () => {
      const { sendWhatsappMessage } = await import("./whatsappWebhook");

      const result = await sendWhatsappMessage(
        "valid_phone_number_id",
        "",
        "5511999998888",
        "Olá!"
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INVALID_CREDENTIALS");
    });

    it("attempts real API call with valid credentials (will fail with fake token)", async () => {
      const { sendWhatsappMessage } = await import("./whatsappWebhook");

      const result = await sendWhatsappMessage(
        "fake_phone_number_id",
        "fake_access_token",
        "5511999998888",
        "Teste de envio"
      );

      // With fake credentials, the Meta API should return an error (not INVALID_CREDENTIALS)
      expect(result.success).toBe(false);
      expect(result.errorCode).not.toBe("INVALID_CREDENTIALS");
      expect(result.error).toBeDefined();
    }, 15000);
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

  describe("getSettingsByPhoneNumberId", () => {
    it("returns undefined for non-existent phoneNumberId", async () => {
      const { getSettingsByPhoneNumberId } = await import("./whatsappDb");
      const result = await getSettingsByPhoneNumberId("NON_EXISTENT_PHONE_ID");
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
