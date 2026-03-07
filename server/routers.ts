import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getActiveBusinessTypes,
  getActiveSubscriptionPlans,
  getEstablishmentByOwnerId,
  createEstablishment,
  updateEstablishment,
  advanceOnboardingStep,
  generateUniqueSlug,
} from "./db";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============================================================
  // REFERENCE DATA (public)
  // ============================================================
  businessTypes: router({
    list: publicProcedure.query(async () => {
      return getActiveBusinessTypes();
    }),
  }),

  subscriptionPlans: router({
    list: publicProcedure.query(async () => {
      return getActiveSubscriptionPlans();
    }),
  }),

  // ============================================================
  // ESTABLISHMENT (protected — tenant owner)
  // ============================================================
  establishment: router({
    /** Get current user's establishment (tenant resolution) */
    mine: protectedProcedure.query(async ({ ctx }) => {
      return getEstablishmentByOwnerId(ctx.user.id);
    }),

    /** Create a new establishment (onboarding step 1) */
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2).max(200),
          businessTypeId: z.number().int().positive(),
          phone: z.string().max(20).optional(),
          email: z.string().email().max(255).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check if user already has an establishment
        const existing = await getEstablishmentByOwnerId(ctx.user.id);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Você já possui um estabelecimento cadastrado.",
          });
        }

        const slug = await generateUniqueSlug(input.name);

        const establishment = await createEstablishment({
          ownerId: ctx.user.id,
          businessTypeId: input.businessTypeId,
          name: input.name,
          slug,
          phone: input.phone ?? null,
          email: input.email ?? null,
          onboardingStep: 2,
          onboardingCompleted: false,
          isActive: true,
          timezone: "America/Sao_Paulo",
        });

        return establishment;
      }),

    /** Update establishment profile */
    update: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2).max(200).optional(),
          description: z.string().max(500).optional(),
          phone: z.string().max(20).optional(),
          email: z.string().email().max(255).optional(),
          addressZipcode: z.string().max(10).optional(),
          addressStreet: z.string().max(255).optional(),
          addressNumber: z.string().max(20).optional(),
          addressComplement: z.string().max(100).optional(),
          addressNeighborhood: z.string().max(100).optional(),
          addressCity: z.string().max(100).optional(),
          addressState: z.string().length(2).optional(),
          timezone: z.string().max(50).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await getEstablishmentByOwnerId(ctx.user.id);
        if (!establishment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Estabelecimento não encontrado.",
          });
        }

        return updateEstablishment(establishment.id, ctx.user.id, input);
      }),

    /** Advance onboarding to next step */
    advanceOnboarding: protectedProcedure
      .input(
        z.object({
          step: z.number().int().min(2).max(7),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await getEstablishmentByOwnerId(ctx.user.id);
        if (!establishment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Estabelecimento não encontrado.",
          });
        }

        // Only allow advancing forward
        if (input.step <= establishment.onboardingStep && !establishment.onboardingCompleted) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Não é possível retroceder no onboarding.",
          });
        }

        return advanceOnboardingStep(establishment.id, ctx.user.id, input.step);
      }),
  }),
});

export type AppRouter = typeof appRouter;
