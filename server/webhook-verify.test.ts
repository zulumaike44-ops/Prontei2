import { describe, it, expect } from "vitest";

describe("Webhook Verify Token", () => {
  it("WHATSAPP_WEBHOOK_VERIFY_TOKEN deve estar configurado", () => {
    const token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token!.length).toBeGreaterThan(0);
  });

  it("WHATSAPP_WEBHOOK_VERIFY_TOKEN deve ter valor esperado", () => {
    const token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    expect(token).toBe("prontei_verify_2024");
  });
});
