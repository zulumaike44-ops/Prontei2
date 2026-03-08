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
  getProfessionalsByEstablishment,
  getProfessionalById,
  createProfessional,
  updateProfessional,
  softDeleteProfessional,
  countProfessionalsByEstablishment,
} from "./db";
import { TRPCError } from "@trpc/server";

// ============================================================
// HELPER: resolve tenant (establishment) for current user
// ============================================================
async function resolveTenant(userId: number) {
  const establishment = await getEstablishmentByOwnerId(userId);
  if (!establishment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Estabelecimento não encontrado. Complete o onboarding primeiro.",
    });
  }
  return establishment;
}

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

        if (
          input.step <= establishment.onboardingStep &&
          !establishment.onboardingCompleted
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Não é possível retroceder no onboarding.",
          });
        }

        return advanceOnboardingStep(
          establishment.id,
          ctx.user.id,
          input.step
        );
      }),
  }),

  // ============================================================
  // PROFESSIONALS (protected — tenant-scoped)
  // ============================================================
  professional: router({
    /** List all professionals for current tenant */
    list: protectedProcedure.query(async ({ ctx }) => {
      const establishment = await resolveTenant(ctx.user.id);
      return getProfessionalsByEstablishment(establishment.id);
    }),

    /** Get a single professional by ID */
    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        const professional = await getProfessionalById(
          input.id,
          establishment.id
        );
        if (!professional) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profissional não encontrado.",
          });
        }
        return professional;
      }),

    /** Create a new professional */
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(150),
          email: z
            .string()
            .email("E-mail inválido")
            .max(255)
            .optional()
            .or(z.literal("")),
          phone: z.string().max(20).optional().or(z.literal("")),
          bio: z.string().max(500).optional().or(z.literal("")),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);

        // Check plan limits
        const count = await countProfessionalsByEstablishment(
          establishment.id
        );
        // MVP: limit to 50 professionals per establishment
        if (count >= 50) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Limite de profissionais atingido. Máximo de 50 por estabelecimento.",
          });
        }

        const professional = await createProfessional({
          establishmentId: establishment.id,
          name: input.name,
          email: input.email || null,
          phone: input.phone || null,
          bio: input.bio || null,
          isActive: true,
          displayOrder: count, // append at end
        });

        return professional;
      }),

    /** Update an existing professional */
    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          name: z.string().min(2).max(150).optional(),
          email: z
            .string()
            .email("E-mail inválido")
            .max(255)
            .optional()
            .or(z.literal("")),
          phone: z.string().max(20).optional().or(z.literal("")),
          bio: z.string().max(500).optional().or(z.literal("")),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        const existing = await getProfessionalById(
          input.id,
          establishment.id
        );
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profissional não encontrado.",
          });
        }

        const { id, ...updateData } = input;
        // Normalize empty strings to null
        const normalized = {
          ...updateData,
          email: updateData.email || null,
          phone: updateData.phone || null,
          bio: updateData.bio || null,
        };

        return updateProfessional(id, establishment.id, normalized);
      }),

    /** Soft delete a professional */
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        const existing = await getProfessionalById(
          input.id,
          establishment.id
        );
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profissional não encontrado.",
          });
        }

        return softDeleteProfessional(input.id, establishment.id);
      }),

    /** Count professionals for current tenant */
    count: protectedProcedure.query(async ({ ctx }) => {
      const establishment = await resolveTenant(ctx.user.id);
      return { count: await countProfessionalsByEstablishment(establishment.id) };
    }),
  }),
});

export type AppRouter = typeof appRouter;
