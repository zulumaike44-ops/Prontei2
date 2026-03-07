import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockUser(overrides?: Partial<AuthenticatedUser>): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    phone: null,
    avatarUrl: null,
    loginMethod: "manus",
    role: "user",
    isActive: true,
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function createMockContext(user: AuthenticatedUser | null = null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// Mock the db module
vi.mock("./db", () => ({
  getActiveBusinessTypes: vi.fn().mockResolvedValue([
    { id: 1, name: "Salão de Beleza", slug: "salao-de-beleza", icon: "💇‍♀️", isActive: true },
    { id: 2, name: "Barbearia", slug: "barbearia", icon: "💈", isActive: true },
  ]),
  getActiveSubscriptionPlans: vi.fn().mockResolvedValue([
    { id: 1, name: "Gratuito", slug: "gratuito", priceMonthly: "0.00" },
  ]),
  getEstablishmentByOwnerId: vi.fn().mockResolvedValue(null),
  createEstablishment: vi.fn().mockImplementation(async (data) => ({
    id: 1,
    ...data,
    slug: "salao-da-maria",
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  updateEstablishment: vi.fn().mockImplementation(async (_id, _ownerId, data) => ({
    id: 1,
    ownerId: 1,
    name: data.name || "Salão da Maria",
    slug: "salao-da-maria",
    ...data,
  })),
  advanceOnboardingStep: vi.fn().mockImplementation(async (_id, _ownerId, step) => ({
    id: 1,
    onboardingStep: step > 6 ? 6 : step,
    onboardingCompleted: step > 6,
  })),
  generateUniqueSlug: vi.fn().mockResolvedValue("salao-da-maria"),
}));

describe("businessTypes.list", () => {
  it("returns active business types (public)", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.businessTypes.list();

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("name", "Salão de Beleza");
  });
});

describe("subscriptionPlans.list", () => {
  it("returns active subscription plans (public)", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscriptionPlans.list();

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("name", "Gratuito");
  });
});

describe("establishment.mine", () => {
  it("requires authentication", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.establishment.mine()).rejects.toThrow();
  });

  it("returns null when user has no establishment", async () => {
    const user = createMockUser();
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.establishment.mine();
    expect(result).toBeNull();
  });
});

describe("establishment.create", () => {
  it("requires authentication", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.establishment.create({
        name: "Test",
        businessTypeId: 1,
      })
    ).rejects.toThrow();
  });

  it("creates establishment with valid input", async () => {
    const user = createMockUser();
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.establishment.create({
      name: "Salão da Maria",
      businessTypeId: 1,
      phone: "(11) 99999-9999",
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("slug", "salao-da-maria");
  });

  it("rejects name shorter than 2 characters", async () => {
    const user = createMockUser();
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.establishment.create({
        name: "A",
        businessTypeId: 1,
      })
    ).rejects.toThrow();
  });

  it("rejects invalid businessTypeId", async () => {
    const user = createMockUser();
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.establishment.create({
        name: "Test Salon",
        businessTypeId: -1,
      })
    ).rejects.toThrow();
  });
});

describe("establishment.update", () => {
  beforeEach(async () => {
    const { getEstablishmentByOwnerId } = await import("./db");
    (getEstablishmentByOwnerId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      ownerId: 1,
      name: "Salão da Maria",
      onboardingStep: 2,
      onboardingCompleted: false,
    });
  });

  it("updates establishment name", async () => {
    const user = createMockUser();
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.establishment.update({
      name: "Novo Nome",
    });

    expect(result).toBeDefined();
  });

  it("rejects invalid email format", async () => {
    const user = createMockUser();
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.establishment.update({
        email: "not-an-email",
      })
    ).rejects.toThrow();
  });
});

describe("establishment.advanceOnboarding", () => {
  beforeEach(async () => {
    const { getEstablishmentByOwnerId } = await import("./db");
    (getEstablishmentByOwnerId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      ownerId: 1,
      name: "Salão da Maria",
      onboardingStep: 2,
      onboardingCompleted: false,
    });
  });

  it("advances onboarding step", async () => {
    const user = createMockUser();
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.establishment.advanceOnboarding({ step: 3 });

    expect(result).toBeDefined();
  });

  it("rejects step below minimum", async () => {
    const user = createMockUser();
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.establishment.advanceOnboarding({ step: 0 })
    ).rejects.toThrow();
  });

  it("rejects step above maximum", async () => {
    const user = createMockUser();
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.establishment.advanceOnboarding({ step: 8 })
    ).rejects.toThrow();
  });
});
