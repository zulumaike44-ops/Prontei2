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
  getServicesByEstablishment,
  getServiceById,
  createService,
  updateService,
  softDeleteService,
  countServicesByEstablishment,
  getProfessionalServiceLinks,
  getServiceProfessionalLinks,
  upsertProfessionalService,
  removeProfessionalService,
  getWorkingHoursByProfessional,
  saveWeeklySchedule,
  getBlockedTimesByEstablishment,
  getBlockedTimeById,
  createBlockedTime,
  updateBlockedTime,
  softDeleteBlockedTime,
  countBlockedTimesByEstablishment,
  normalizePhone,
  getCustomersByEstablishment,
  getCustomerById,
  getCustomerByNormalizedPhone,
  createCustomer,
  updateCustomer,
  deactivateCustomer,
  countCustomersByEstablishment,
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
    mine: protectedProcedure.query(async ({ ctx }) => {
      return getEstablishmentByOwnerId(ctx.user.id);
    }),

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
    list: protectedProcedure.query(async ({ ctx }) => {
      const establishment = await resolveTenant(ctx.user.id);
      return getProfessionalsByEstablishment(establishment.id);
    }),

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

    create: protectedProcedure
      .input(
        z.object({
          name: z
            .string()
            .min(2, "Nome deve ter pelo menos 2 caracteres")
            .max(150),
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

        const count = await countProfessionalsByEstablishment(
          establishment.id
        );
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
          displayOrder: count,
        });

        return professional;
      }),

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
        const normalized = {
          ...updateData,
          email: updateData.email || null,
          phone: updateData.phone || null,
          bio: updateData.bio || null,
        };

        return updateProfessional(id, establishment.id, normalized);
      }),

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

    count: protectedProcedure.query(async ({ ctx }) => {
      const establishment = await resolveTenant(ctx.user.id);
      return {
        count: await countProfessionalsByEstablishment(establishment.id),
      };
    }),

    /** List services linked to a professional */
    services: protectedProcedure
      .input(z.object({ professionalId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        // Verify professional belongs to tenant
        const prof = await getProfessionalById(
          input.professionalId,
          establishment.id
        );
        if (!prof) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profissional não encontrado.",
          });
        }
        return getProfessionalServiceLinks(
          input.professionalId,
          establishment.id
        );
      }),

    /** Link a service to a professional (upsert) */
    linkService: protectedProcedure
      .input(
        z.object({
          professionalId: z.number().int().positive(),
          serviceId: z.number().int().positive(),
          customPrice: z.string().optional(),
          customDurationMinutes: z.number().int().positive().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);

        // Verify professional belongs to tenant
        const prof = await getProfessionalById(
          input.professionalId,
          establishment.id
        );
        if (!prof) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profissional não encontrado.",
          });
        }

        // Verify service belongs to tenant
        const svc = await getServiceById(input.serviceId, establishment.id);
        if (!svc) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Serviço não encontrado.",
          });
        }

        return upsertProfessionalService({
          professionalId: input.professionalId,
          serviceId: input.serviceId,
          customPrice: input.customPrice ?? null,
          customDurationMinutes: input.customDurationMinutes ?? null,
        });
      }),

    /** Unlink a service from a professional */
    unlinkService: protectedProcedure
      .input(
        z.object({
          professionalId: z.number().int().positive(),
          serviceId: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);

        // Verify professional belongs to tenant
        const prof = await getProfessionalById(
          input.professionalId,
          establishment.id
        );
        if (!prof) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profissional não encontrado.",
          });
        }

        return removeProfessionalService(
          input.professionalId,
          input.serviceId
        );
      }),
  }),

  // ============================================================
  // SERVICES (protected — tenant-scoped)
  // ============================================================
  service: router({
    /** List all services for current tenant */
    list: protectedProcedure.query(async ({ ctx }) => {
      const establishment = await resolveTenant(ctx.user.id);
      return getServicesByEstablishment(establishment.id);
    }),

    /** Get a single service by ID */
    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        const service = await getServiceById(input.id, establishment.id);
        if (!service) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Serviço não encontrado.",
          });
        }
        return service;
      }),

    /** Create a new service */
    create: protectedProcedure
      .input(
        z.object({
          name: z
            .string()
            .min(2, "Nome deve ter pelo menos 2 caracteres")
            .max(200),
          description: z.string().max(500).optional().or(z.literal("")),
          durationMinutes: z
            .number()
            .int()
            .positive("Duração deve ser maior que zero")
            .max(480, "Duração máxima de 8 horas"),
          price: z.string().refine(
            (val) => {
              const num = parseFloat(val);
              return !isNaN(num) && num >= 0;
            },
            { message: "Preço deve ser um valor numérico >= 0" }
          ),
          category: z.string().max(100).optional().or(z.literal("")),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);

        // Check plan limits
        const count = await countServicesByEstablishment(establishment.id);
        if (count >= 100) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Limite de serviços atingido. Máximo de 100 por estabelecimento.",
          });
        }

        const service = await createService({
          establishmentId: establishment.id,
          name: input.name,
          description: input.description || null,
          durationMinutes: input.durationMinutes,
          price: input.price,
          category: input.category || null,
          isActive: true,
          displayOrder: count,
        });

        return service;
      }),

    /** Update an existing service */
    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          name: z.string().min(2).max(200).optional(),
          description: z.string().max(500).optional().or(z.literal("")),
          durationMinutes: z
            .number()
            .int()
            .positive()
            .max(480)
            .optional(),
          price: z
            .string()
            .refine(
              (val) => {
                const num = parseFloat(val);
                return !isNaN(num) && num >= 0;
              },
              { message: "Preço deve ser um valor numérico >= 0" }
            )
            .optional(),
          category: z.string().max(100).optional().or(z.literal("")),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        const existing = await getServiceById(input.id, establishment.id);
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Serviço não encontrado.",
          });
        }

        const { id, ...updateData } = input;
        const normalized = {
          ...updateData,
          description: updateData.description || null,
          category: updateData.category || null,
        };

        return updateService(id, establishment.id, normalized);
      }),

    /** Soft delete a service */
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        const existing = await getServiceById(input.id, establishment.id);
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Serviço não encontrado.",
          });
        }

        return softDeleteService(input.id, establishment.id);
      }),

    /** Count services for current tenant */
    count: protectedProcedure.query(async ({ ctx }) => {
      const establishment = await resolveTenant(ctx.user.id);
      return {
        count: await countServicesByEstablishment(establishment.id),
      };
    }),

    /** List professionals linked to a service */
    professionals: protectedProcedure
      .input(z.object({ serviceId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        const svc = await getServiceById(input.serviceId, establishment.id);
        if (!svc) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Serviço não encontrado.",
          });
        }
        return getServiceProfessionalLinks(input.serviceId, establishment.id);
      }),
  }),

  // ============================================================
  // WORKING HOURS (protected — tenant-scoped)
  // ============================================================
  workingHours: router({
    /** Get weekly schedule for a professional */
    getByProfessional: protectedProcedure
      .input(z.object({ professionalId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        // Verify professional belongs to tenant
        const prof = await getProfessionalById(
          input.professionalId,
          establishment.id
        );
        if (!prof) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profissional não encontrado.",
          });
        }
        return getWorkingHoursByProfessional(
          input.professionalId,
          establishment.id
        );
      }),

    /** Save complete weekly schedule for a professional (replace all) */
    saveWeek: protectedProcedure
      .input(
        z.object({
          professionalId: z.number().int().positive(),
          schedule: z.array(
            z.object({
              dayOfWeek: z.number().int().min(0).max(6),
              startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato deve ser HH:MM"),
              endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato deve ser HH:MM"),
              breakStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato deve ser HH:MM").nullable().optional(),
              breakEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato deve ser HH:MM").nullable().optional(),
              isActive: z.boolean(),
            })
          ).min(1).max(7),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);

        // Verify professional belongs to tenant
        const prof = await getProfessionalById(
          input.professionalId,
          establishment.id
        );
        if (!prof) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profissional não encontrado.",
          });
        }

        // Validate business rules for each day
        const seenDays = new Set<number>();
        for (const day of input.schedule) {
          // Check for duplicate days
          if (seenDays.has(day.dayOfWeek)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Dia da semana ${day.dayOfWeek} duplicado na grade.`,
            });
          }
          seenDays.add(day.dayOfWeek);

          // Only validate times for active days
          if (!day.isActive) continue;

          // start_time < end_time
          if (day.startTime >= day.endTime) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Horário de início deve ser anterior ao horário de término (dia ${day.dayOfWeek}).`,
            });
          }

          // Break validation
          const hasBreakStart = day.breakStart != null && day.breakStart !== "";
          const hasBreakEnd = day.breakEnd != null && day.breakEnd !== "";

          if (hasBreakStart !== hasBreakEnd) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Início e fim do intervalo devem ser informados juntos (dia ${day.dayOfWeek}).`,
            });
          }

          if (hasBreakStart && hasBreakEnd) {
            const breakStart = day.breakStart!;
            const breakEnd = day.breakEnd!;

            // break_start < break_end
            if (breakStart >= breakEnd) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Início do intervalo deve ser anterior ao fim do intervalo (dia ${day.dayOfWeek}).`,
              });
            }

            // Break must be within working hours
            if (breakStart < day.startTime || breakEnd > day.endTime) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Intervalo deve estar dentro do horário de trabalho (dia ${day.dayOfWeek}).`,
              });
            }
          }
        }

        // Normalize schedule
        const normalized = input.schedule.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          startTime: day.startTime,
          endTime: day.endTime,
          breakStart: (day.breakStart && day.breakStart !== "") ? day.breakStart : null,
          breakEnd: (day.breakEnd && day.breakEnd !== "") ? day.breakEnd : null,
          isActive: day.isActive,
        }));

        return saveWeeklySchedule(
          input.professionalId,
          establishment.id,
          normalized
        );
      }),
  }),

  // ============================================================
  // BLOCKED TIMES (protected — tenant-scoped)
  // ============================================================
  blockedTime: router({
    /** List blocked times with optional filters */
    list: protectedProcedure
      .input(
        z.object({
          professionalId: z.number().int().positive().optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
          activeOnly: z.boolean().optional().default(true),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);

        // If professionalId provided, verify it belongs to tenant
        if (input?.professionalId) {
          const prof = await getProfessionalById(input.professionalId, establishment.id);
          if (!prof) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Profissional não encontrado.",
            });
          }
        }

        return getBlockedTimesByEstablishment(establishment.id, {
          professionalId: input?.professionalId,
          dateFrom: input?.dateFrom ? new Date(input.dateFrom) : undefined,
          dateTo: input?.dateTo ? new Date(input.dateTo) : undefined,
          activeOnly: input?.activeOnly ?? true,
        });
      }),

    /** Get a single blocked time by ID */
    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        const blocked = await getBlockedTimeById(input.id, establishment.id);
        if (!blocked) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Bloqueio não encontrado.",
          });
        }
        return blocked;
      }),

    /** Create a new blocked time */
    create: protectedProcedure
      .input(
        z.object({
          professionalId: z.number().int().positive().optional(),
          title: z.string().min(1, "Título é obrigatório").max(200),
          reason: z.string().max(255).optional().or(z.literal("")),
          startDatetime: z.string().min(1, "Data/hora de início é obrigatória"),
          endDatetime: z.string().min(1, "Data/hora de término é obrigatória"),
          isAllDay: z.boolean().default(false),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);

        // Validate professionalId belongs to tenant
        if (input.professionalId) {
          const prof = await getProfessionalById(input.professionalId, establishment.id);
          if (!prof) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Profissional não encontrado neste estabelecimento.",
            });
          }
        }

        const startDt = new Date(input.startDatetime);
        const endDt = new Date(input.endDatetime);

        // Validate dates
        if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Datas inválidas.",
          });
        }

        if (endDt <= startDt) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Data/hora de término deve ser posterior à de início.",
          });
        }

        // Limit: max 200 active blocked times per establishment
        const count = await countBlockedTimesByEstablishment(establishment.id);
        if (count >= 200) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Limite de bloqueios atingido. Máximo de 200 bloqueios ativos por estabelecimento.",
          });
        }

        return createBlockedTime({
          establishmentId: establishment.id,
          professionalId: input.professionalId ?? null,
          title: input.title,
          reason: input.reason || null,
          startDatetime: startDt,
          endDatetime: endDt,
          isAllDay: input.isAllDay,
        });
      }),

    /** Update a blocked time */
    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          professionalId: z.number().int().positive().nullable().optional(),
          title: z.string().min(1).max(200).optional(),
          reason: z.string().max(255).optional().or(z.literal("")),
          startDatetime: z.string().optional(),
          endDatetime: z.string().optional(),
          isAllDay: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);

        const existing = await getBlockedTimeById(input.id, establishment.id);
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Bloqueio não encontrado.",
          });
        }

        // Validate professionalId if changing
        if (input.professionalId !== undefined && input.professionalId !== null) {
          const prof = await getProfessionalById(input.professionalId, establishment.id);
          if (!prof) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Profissional não encontrado neste estabelecimento.",
            });
          }
        }

        // Validate dates if provided
        const startDt = input.startDatetime ? new Date(input.startDatetime) : existing.startDatetime;
        const endDt = input.endDatetime ? new Date(input.endDatetime) : existing.endDatetime;

        if (input.startDatetime && isNaN(new Date(input.startDatetime).getTime())) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Data de início inválida." });
        }
        if (input.endDatetime && isNaN(new Date(input.endDatetime).getTime())) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Data de término inválida." });
        }

        if (endDt <= startDt) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Data/hora de término deve ser posterior à de início.",
          });
        }

        const updateData: Record<string, unknown> = {};
        if (input.professionalId !== undefined) updateData.professionalId = input.professionalId;
        if (input.title !== undefined) updateData.title = input.title;
        if (input.reason !== undefined) updateData.reason = input.reason || null;
        if (input.startDatetime !== undefined) updateData.startDatetime = startDt;
        if (input.endDatetime !== undefined) updateData.endDatetime = endDt;
        if (input.isAllDay !== undefined) updateData.isAllDay = input.isAllDay;

        return updateBlockedTime(input.id, establishment.id, updateData);
      }),

    /** Soft delete a blocked time */
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        const existing = await getBlockedTimeById(input.id, establishment.id);
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Bloqueio não encontrado.",
          });
        }

        return softDeleteBlockedTime(input.id, establishment.id);
      }),

    /** Count active blocked times for current tenant */
    count: protectedProcedure.query(async ({ ctx }) => {
      const establishment = await resolveTenant(ctx.user.id);
      return {
        count: await countBlockedTimesByEstablishment(establishment.id),
      };
    }),
  }),

  // ============================================================
  // CUSTOMERS (protected — tenant-scoped)
  // ============================================================
  customer: router({
    /** List customers with optional search and active filter */
    list: protectedProcedure
      .input(
        z.object({
          search: z.string().optional(),
          activeOnly: z.boolean().optional().default(true),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        return getCustomersByEstablishment(establishment.id, {
          search: input?.search,
          activeOnly: input?.activeOnly ?? true,
        });
      }),

    /** Get a single customer by ID */
    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        const customer = await getCustomerById(input.id, establishment.id);
        if (!customer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cliente não encontrado.",
          });
        }
        return customer;
      }),

    /** Create a new customer */
    create: protectedProcedure
      .input(
        z.object({
          name: z.string()
            .min(2, "Nome deve ter pelo menos 2 caracteres")
            .max(150, "Nome deve ter no máximo 150 caracteres"),
          phone: z.string()
            .min(8, "Telefone deve ter pelo menos 8 dígitos")
            .max(20, "Telefone deve ter no máximo 20 caracteres"),
          email: z.string().email("E-mail inválido").max(255).optional().or(z.literal("")),
          notes: z.string().max(500).optional().or(z.literal("")),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);

        // Limit: max 2000 active customers per establishment
        const count = await countCustomersByEstablishment(establishment.id);
        if (count >= 2000) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Limite de clientes atingido. Máximo de 2000 clientes ativos por estabelecimento.",
          });
        }

        // Normalize phone for deduplication
        const normalized = normalizePhone(input.phone);
        if (normalized.length < 8) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Telefone deve conter pelo menos 8 dígitos numéricos.",
          });
        }

        // Check for duplicate normalized_phone within same establishment
        const existing = await getCustomerByNormalizedPhone(normalized, establishment.id);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Já existe um cliente cadastrado com este telefone neste estabelecimento.",
          });
        }

        return createCustomer({
          establishmentId: establishment.id,
          name: input.name,
          phone: input.phone.trim(),
          normalizedPhone: normalized,
          email: input.email || null,
          notes: input.notes || null,
        });
      }),

    /** Update an existing customer */
    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          name: z.string().min(2).max(150).optional(),
          phone: z.string().min(8).max(20).optional(),
          email: z.string().email("E-mail inválido").max(255).optional().or(z.literal("")),
          notes: z.string().max(500).optional().or(z.literal("")),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        const existing = await getCustomerById(input.id, establishment.id);
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cliente não encontrado.",
          });
        }

        const updateData: Record<string, unknown> = {};

        if (input.name !== undefined) updateData.name = input.name;
        if (input.email !== undefined) updateData.email = input.email || null;
        if (input.notes !== undefined) updateData.notes = input.notes || null;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;

        // If phone is being updated, re-normalize and check for duplicates
        if (input.phone !== undefined) {
          const normalized = normalizePhone(input.phone);
          if (normalized.length < 8) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Telefone deve conter pelo menos 8 dígitos numéricos.",
            });
          }

          // Check duplicate only if normalized phone actually changed
          if (normalized !== existing.normalizedPhone) {
            const dup = await getCustomerByNormalizedPhone(normalized, establishment.id);
            if (dup) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Já existe um cliente cadastrado com este telefone neste estabelecimento.",
              });
            }
          }

          updateData.phone = input.phone.trim();
          updateData.normalizedPhone = normalized;
        }

        return updateCustomer(input.id, establishment.id, updateData);
      }),

    /** Deactivate a customer (soft delete via isActive=false) */
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        const existing = await getCustomerById(input.id, establishment.id);
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cliente não encontrado.",
          });
        }

        return deactivateCustomer(input.id, establishment.id);
      }),

    /** Count active customers for current tenant */
    count: protectedProcedure.query(async ({ ctx }) => {
      const establishment = await resolveTenant(ctx.user.id);
      return {
        count: await countCustomersByEstablishment(establishment.id),
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
