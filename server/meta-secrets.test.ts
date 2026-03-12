import { describe, it, expect } from "vitest";

describe("Meta WhatsApp secrets", () => {
  it("META_APP_ID should be set and be a numeric string", () => {
    const val = process.env.META_APP_ID;
    expect(val).toBeDefined();
    expect(val).not.toBe("");
    expect(/^\d+$/.test(val!)).toBe(true);
  });

  it("META_APP_SECRET should be set and be a hex string", () => {
    const val = process.env.META_APP_SECRET;
    expect(val).toBeDefined();
    expect(val).not.toBe("");
    expect(/^[a-f0-9]{32}$/.test(val!)).toBe(true);
  });

  it("META_CONFIG_ID should be set and be a numeric string", () => {
    const val = process.env.META_CONFIG_ID;
    expect(val).toBeDefined();
    expect(val).not.toBe("");
    expect(/^\d+$/.test(val!)).toBe(true);
  });

  it("ENV object should expose meta credentials", async () => {
    const { ENV } = await import("./_core/env");
    expect(ENV.metaAppId).toBe(process.env.META_APP_ID);
    expect(ENV.metaAppSecret).toBe(process.env.META_APP_SECRET);
    expect(ENV.metaConfigId).toBe(process.env.META_CONFIG_ID);
  });
});
