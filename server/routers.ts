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
  getEstablishmentById,
} from "./db";
import { TRPCError } from "@trpc/server";
import {
  getAppointmentsByEstablishment,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  checkAppointmentConflict,
  countAppointmentsByEstablishment,
  VALID_STATUSES,
  ACTIVE_APPOINTMENT_STATUSES,
} from "./appointmentDb";
import { calculateAvailableSlots, hasDateOverlap } from "./availability";
import {
  getWhatsappSettings,
  upsertWhatsappSettings,
  getConversationsByEstablishment,
  getConversationById,
  getMessagesByConversation,
  createMessage,
  closeConversation,
} from "./whatsappDb";
import { sendWhatsappMessage } from "./whatsappWebhook";
import { ENV } from "./_core/env";

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

  // ============================================================
  // AVAILABILITY (protected — tenant-scoped)
  // ============================================================
  availability: router({
    /** Get available slots for a professional+service on a date */
    getSlots: protectedProcedure
      .input(
        z.object({
          professionalId: z.number().int().positive(),
          serviceId: z.number().int().positive(),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido. Use YYYY-MM-DD."),
        })
      )
      .query(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);

        // Validate professional belongs to tenant
        const professional = await getProfessionalById(input.professionalId, establishment.id);
        if (!professional) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profissional não encontrado neste estabelecimento.",
          });
        }

        // Validate service belongs to tenant
        const service = await getServiceById(input.serviceId, establishment.id);
        if (!service) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Serviço não encontrado neste estabelecimento.",
          });
        }

        return calculateAvailableSlots({
          professionalId: input.professionalId,
          serviceId: input.serviceId,
          date: input.date,
          establishmentId: establishment.id,
        });
      }),
  }),

  // ============================================================
  // APPOINTMENTS (protected — tenant-scoped)
  // ============================================================
  appointment: router({
    /** List appointments with optional filters */
    list: protectedProcedure
      .input(
        z.object({
          professionalId: z.number().int().positive().optional(),
          customerId: z.number().int().positive().optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
          status: z.string().optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        return getAppointmentsByEstablishment(establishment.id, {
          professionalId: input?.professionalId,
          customerId: input?.customerId,
          dateFrom: input?.dateFrom ? new Date(input.dateFrom) : undefined,
          dateTo: input?.dateTo ? new Date(input.dateTo) : undefined,
          status: input?.status,
        });
      }),

    /** Get a single appointment by ID */
    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        const appointment = await getAppointmentById(input.id, establishment.id);
        if (!appointment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agendamento não encontrado.",
          });
        }
        return appointment;
      }),

    /** Create a new appointment */
    create: protectedProcedure
      .input(
        z.object({
          professionalId: z.number().int().positive(),
          serviceId: z.number().int().positive(),
          customerId: z.number().int().positive(),
          startDatetime: z.string(), // ISO datetime string
          notes: z.string().max(500).optional().or(z.literal("")),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);

        // 1. Validate professional belongs to tenant
        const professional = await getProfessionalById(input.professionalId, establishment.id);
        if (!professional) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profissional não encontrado neste estabelecimento.",
          });
        }

        // 2. Validate service belongs to tenant
        const service = await getServiceById(input.serviceId, establishment.id);
        if (!service) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Serviço não encontrado neste estabelecimento.",
          });
        }

        // 3. Validate customer belongs to tenant
        const customer = await getCustomerById(input.customerId, establishment.id);
        if (!customer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cliente não encontrado neste estabelecimento.",
          });
        }

        // 4. Validate professional_service link exists and is active
        const links = await getProfessionalServiceLinks(input.professionalId, establishment.id);
        const link = links.find((l) => l.serviceId === input.serviceId && l.isActive);
        if (!link) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este profissional não oferece este serviço.",
          });
        }

        // 5. Calculate effective duration and price
        const durationMinutes = link.customDurationMinutes ?? link.serviceDurationMinutes;
        const effectivePrice = link.customPrice ?? link.servicePrice ?? "0";

        if (!durationMinutes || durationMinutes <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Duração do serviço inválida.",
          });
        }

        // 6. Calculate start and end datetimes
        const startDatetime = new Date(input.startDatetime);
        if (isNaN(startDatetime.getTime())) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Data/hora de início inválida.",
          });
        }

        const endDatetime = new Date(startDatetime.getTime() + durationMinutes * 60 * 1000);

        // 7. Check for appointment conflicts
        const conflicts = await checkAppointmentConflict(
          input.professionalId,
          establishment.id,
          startDatetime,
          endDatetime
        );

        if (conflicts.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Conflito de horário: já existe um agendamento neste período para este profissional.",
          });
        }

        // 8. Check blocked times
        const dayStart = new Date(startDatetime);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(startDatetime);
        dayEnd.setHours(23, 59, 59, 999);

        const blockedList = await getBlockedTimesByEstablishment(establishment.id, {
          dateFrom: dayStart,
          dateTo: dayEnd,
          activeOnly: true,
        });

        const relevantBlocked = blockedList.filter(
          (bt) => bt.professionalId === null || bt.professionalId === input.professionalId
        );

        const blockedConflict = relevantBlocked.some((bt) =>
          hasDateOverlap(
            new Date(bt.startDatetime),
            new Date(bt.endDatetime),
            startDatetime,
            endDatetime
          )
        );

        if (blockedConflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Conflito: existe um bloqueio de horário neste período.",
          });
        }

        // 9. Create the appointment
        return createAppointment({
          establishmentId: establishment.id,
          professionalId: input.professionalId,
          serviceId: input.serviceId,
          customerId: input.customerId,
          startDatetime,
          endDatetime,
          durationMinutes,
          price: effectivePrice,
          status: "pending",
          notes: input.notes || null,
          source: "manual",
          createdBy: ctx.user.id,
        });
      }),

    /** Update appointment status */
    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]),
          reason: z.string().max(255).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        const existing = await getAppointmentById(input.id, establishment.id);
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agendamento não encontrado.",
          });
        }

        // Validate status transition
        const currentStatus = existing.status;

        // Cannot change from terminal states
        if (["cancelled", "completed", "no_show"].includes(currentStatus) && input.status !== currentStatus) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Não é possível alterar o status de um agendamento ${currentStatus}.`,
          });
        }

        return updateAppointmentStatus(
          input.id,
          establishment.id,
          input.status,
          ctx.user.id,
          input.reason
        );
      }),

    /** Cancel an appointment (shortcut for updateStatus with cancelled) */
    cancel: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          reason: z.string().max(255).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        const existing = await getAppointmentById(input.id, establishment.id);
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agendamento não encontrado.",
          });
        }

        if (["cancelled", "completed", "no_show"].includes(existing.status)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Não é possível cancelar um agendamento ${existing.status}.`,
          });
        }

        return updateAppointmentStatus(
          input.id,
          establishment.id,
          "cancelled",
          ctx.user.id,
          input.reason
        );
      }),

    /** Count appointments for current tenant */
    count: protectedProcedure
      .input(
        z.object({
          status: z.string().optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        return {
          count: await countAppointmentsByEstablishment(establishment.id, {
            status: input?.status,
            dateFrom: input?.dateFrom ? new Date(input.dateFrom) : undefined,
            dateTo: input?.dateTo ? new Date(input.dateTo) : undefined,
          }),
        };
      }),
  }),

  // ============================================================
  // DASHBOARD SUMMARY (protected — tenant-scoped)
  // ============================================================
  dashboard: router({
    /** Get dashboard summary with all key metrics in a single call */
    summary: protectedProcedure.query(async ({ ctx }) => {
      const establishment = await resolveTenant(ctx.user.id);

      // Calculate date ranges
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      // Run all counts in parallel for performance
      const [
        appointmentsToday,
        appointmentsThisMonth,
        activeProfessionals,
        activeServices,
        activeCustomers,
      ] = await Promise.all([
        countAppointmentsByEstablishment(establishment.id, {
          dateFrom: todayStart,
          dateTo: todayEnd,
        }),
        countAppointmentsByEstablishment(establishment.id, {
          dateFrom: monthStart,
          dateTo: monthEnd,
        }),
        countProfessionalsByEstablishment(establishment.id),
        countServicesByEstablishment(establishment.id),
        countCustomersByEstablishment(establishment.id),
      ]);

      return {
        appointmentsToday,
        appointmentsThisMonth,
        activeProfessionals,
        activeServices,
        activeCustomers,
      };
    }),
  }),

  // ============================================================
  // WHATSAPP (protected — tenant-scoped)
  // ============================================================
  whatsapp: router({
    /**
     * Get WhatsApp connection status for current tenant.
     * NEVER exposes: accessToken, phoneNumberId, webhookVerifyToken, businessAccountId.
     * Only returns safe, user-facing data.
     */
    getConnectionStatus: protectedProcedure.query(async ({ ctx }) => {
      const establishment = await resolveTenant(ctx.user.id);
      const settings = await getWhatsappSettings(establishment.id);
      const estab = await getEstablishmentById(establishment.id);

      if (!settings) {
        return {
          status: "not_connected" as const,
          isEnabled: false,
          phoneNumber: null,
          establishmentName: estab?.name ?? null,
          autoReplyEnabled: true,
          autoReplyMessage: null,
          connectedAt: null,
          hasCredentials: false,
          conversationCount: 0,
        };
      }

      const { countConversationsByEstablishment } = await import("./whatsappDb");
      const convCount = await countConversationsByEstablishment(establishment.id);

      // Determine connection status
      const hasCredentials = !!(settings.accessToken && settings.phoneNumberId);
      let status: "not_connected" | "connected" | "error" = "not_connected";
      if (settings.isEnabled && hasCredentials) {
        status = "connected";
      } else if (settings.isEnabled && !hasCredentials) {
        status = "error"; // enabled but missing credentials
      }

      return {
        status,
        isEnabled: settings.isEnabled,
        phoneNumber: settings.phoneNumber, // safe: it's the user's own number
        establishmentName: estab?.name ?? null,
        autoReplyEnabled: settings.autoReplyEnabled,
        autoReplyMessage: settings.autoReplyMessage,
        connectedAt: settings.isEnabled && hasCredentials ? settings.updatedAt : null,
        hasCredentials,
        conversationCount: convCount,
      };
    }),

    /**
     * Get Embedded Signup configuration for the frontend.
     * Returns META_APP_ID and META_CONFIG_ID (safe to expose).
     * NEVER returns META_APP_SECRET.
     */
    getEmbeddedSignupConfig: protectedProcedure.query(async () => {
      const appId = ENV.metaAppId;
      const configId = ENV.metaConfigId;

      if (!appId || !configId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Embedded Signup não configurado. Entre em contato com o suporte.",
        });
      }

      return {
        appId,
        configId,
        sdkVersion: "v21.0",
      };
    }),

    /**
     * Exchange the authorization code from Embedded Signup for a permanent access token.
     * This is the core of the Embedded Signup flow:
     * 1. Frontend opens Meta popup → user authorizes
     * 2. Frontend receives code + phone_number_id + waba_id
     * 3. Frontend sends them here
     * 4. Backend exchanges code for access_token (server-to-server, using APP_SECRET)
     * 5. Backend saves credentials and enables integration
     */
    exchangeCode: protectedProcedure
      .input(
        z.object({
          code: z.string().min(1, "Código de autorização é obrigatório"),
          phoneNumberId: z.string().min(1, "Phone Number ID é obrigatório"),
          wabaId: z.string().min(1, "WABA ID é obrigatório"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);

        // Validate META_APP_SECRET is configured
        if (!ENV.metaAppId || !ENV.metaAppSecret) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Credenciais da plataforma não configuradas. Entre em contato com o suporte.",
          });
        }

        // Exchange code for access_token via Meta Graph API (server-to-server)
        let accessToken: string;
        try {
          const exchangeUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
          exchangeUrl.searchParams.set("client_id", ENV.metaAppId);
          exchangeUrl.searchParams.set("client_secret", ENV.metaAppSecret);
          exchangeUrl.searchParams.set("code", input.code);

          const response = await fetch(exchangeUrl.toString());
          const data = await response.json() as any;

          if (!response.ok || !data.access_token) {
            const errorMsg = data?.error?.message ?? "Falha ao trocar código por token";
            console.error("[WhatsApp Embedded Signup] Code exchange failed:", data);
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Erro na autorização: ${errorMsg}`,
            });
          }

          accessToken = data.access_token;
        } catch (error: any) {
          if (error instanceof TRPCError) throw error;
          console.error("[WhatsApp Embedded Signup] Network error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro de rede ao conectar com a Meta. Tente novamente.",
          });
        }

        // Fetch phone number details from Meta API to get display number
        let phoneNumber: string | null = null;
        try {
          const phoneRes = await fetch(
            `https://graph.facebook.com/v21.0/${input.phoneNumberId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (phoneRes.ok) {
            const phoneData = await phoneRes.json() as any;
            phoneNumber = phoneData.display_phone_number ?? null;
          }
        } catch {
          // Non-critical — we can proceed without the display number
        }

        // Generate secure webhook verify token
        const verifyToken = `prontei_${establishment.id}_${Date.now()}`;

        // Save credentials and enable integration
        await upsertWhatsappSettings({
          establishmentId: establishment.id,
          isEnabled: true,
          provider: "meta",
          accessToken,
          phoneNumberId: input.phoneNumberId,
          phoneNumber,
          businessAccountId: input.wabaId,
          webhookVerifyToken: verifyToken,
        });

        console.log(`[WhatsApp Embedded Signup] Conexão estabelecida para establishment ${establishment.id}`);

        return {
          success: true,
          phoneNumber,
          webhookUrl: `/api/whatsapp/webhook`,
          webhookVerifyToken: verifyToken,
        };
      }),

    /**
     * Connect WhatsApp — manual fallback for admin setup.
     * Kept for backward compatibility. Prefer exchangeCode for Embedded Signup.
     */
    connect: protectedProcedure
      .input(
        z.object({
          accessToken: z.string().min(1, "Token de acesso é obrigatório"),
          phoneNumberId: z.string().min(1, "Phone Number ID é obrigatório"),
          phoneNumber: z.string().max(20).optional(),
          businessAccountId: z.string().max(50).optional(),
          webhookVerifyToken: z.string().max(100).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);

        // Generate a secure webhook verify token if not provided
        const verifyToken = input.webhookVerifyToken || `prontei_${establishment.id}_${Date.now()}`;

        await upsertWhatsappSettings({
          establishmentId: establishment.id,
          isEnabled: true,
          provider: "meta",
          accessToken: input.accessToken,
          phoneNumberId: input.phoneNumberId,
          phoneNumber: input.phoneNumber ?? null,
          businessAccountId: input.businessAccountId ?? null,
          webhookVerifyToken: verifyToken,
        });

        console.log(`[WhatsApp] Conexão estabelecida para establishment ${establishment.id}`);

        return {
          success: true,
          webhookUrl: `/api/whatsapp/webhook`,
          webhookVerifyToken: verifyToken,
        };
      }),

    /**
     * Disconnect WhatsApp — disables integration and clears credentials.
     */
    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      const establishment = await resolveTenant(ctx.user.id);

      await upsertWhatsappSettings({
        establishmentId: establishment.id,
        isEnabled: false,
        accessToken: null,
        phoneNumberId: null,
        businessAccountId: null,
        webhookVerifyToken: null,
      });

      console.log(`[WhatsApp] Conexão removida para establishment ${establishment.id}`);
      return { success: true };
    }),

    /**
     * Test WhatsApp connection — validates credentials by calling Meta API.
     * Does NOT send a real message, just checks if the token is valid.
     */
    testConnection: protectedProcedure.mutation(async ({ ctx }) => {
      const establishment = await resolveTenant(ctx.user.id);
      const settings = await getWhatsappSettings(establishment.id);

      if (!settings || !settings.isEnabled) {
        return {
          success: false,
          error: "WhatsApp não está conectado.",
          errorCode: "NOT_CONNECTED",
        };
      }

      const { validateSendCredentials } = await import("./whatsappWebhook");
      const validation = validateSendCredentials(settings.phoneNumberId, settings.accessToken);
      if (!validation.valid) {
        return {
          success: false,
          error: "Credenciais incompletas. Reconecte o WhatsApp.",
          errorCode: "INVALID_CREDENTIALS",
        };
      }

      // Validate token by calling Meta API (GET phone number info)
      try {
        const url = `https://graph.facebook.com/v21.0/${settings.phoneNumberId}`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${settings.accessToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            phoneNumber: data.display_phone_number ?? settings.phoneNumber,
            verifiedName: data.verified_name ?? null,
            qualityRating: data.quality_rating ?? null,
          };
        } else {
          const errorBody = await response.json().catch(() => ({}));
          const errorMsg = (errorBody as any)?.error?.message ?? "Token inválido ou expirado";
          return {
            success: false,
            error: errorMsg,
            errorCode: String(response.status),
          };
        }
      } catch (networkError: any) {
        return {
          success: false,
          error: `Erro de rede: ${networkError?.message ?? "desconhecido"}`,
          errorCode: "NETWORK_ERROR",
        };
      }
    }),

    /**
     * Update auto-reply settings (safe — no credentials exposed).
     */
    updateAutoReply: protectedProcedure
      .input(
        z.object({
          autoReplyEnabled: z.boolean(),
          autoReplyMessage: z.string().max(1000).optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        await upsertWhatsappSettings({
          establishmentId: establishment.id,
          autoReplyEnabled: input.autoReplyEnabled,
          autoReplyMessage: input.autoReplyMessage ?? null,
        });
        return { success: true };
      }),

    /**
     * Admin-only: update raw settings (for system admin, not end user).
     * Kept for backward compatibility but hidden from user-facing UI.
     */
    adminUpdateSettings: protectedProcedure
      .input(
        z.object({
          isEnabled: z.boolean().optional(),
          phoneNumber: z.string().max(20).optional().nullable(),
          provider: z.string().max(50).optional(),
          accessToken: z.string().optional().nullable(),
          webhookVerifyToken: z.string().max(100).optional().nullable(),
          phoneNumberId: z.string().max(50).optional().nullable(),
          businessAccountId: z.string().max(50).optional().nullable(),
          autoReplyEnabled: z.boolean().optional(),
          autoReplyMessage: z.string().max(1000).optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        return upsertWhatsappSettings({
          establishmentId: establishment.id,
          ...input,
        });
      }),

    /** List conversations for current tenant */
    listConversations: protectedProcedure
      .input(
        z.object({
          status: z.string().optional(),
          limit: z.number().int().positive().max(200).optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        return getConversationsByEstablishment(establishment.id, {
          status: input?.status,
          limit: input?.limit,
        });
      }),

    /** Get a single conversation by ID */
    getConversation: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        const conv = await getConversationById(input.id, establishment.id);
        if (!conv) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversa n\u00e3o encontrada.",
          });
        }
        return conv;
      }),

    /** Get messages for a conversation */
    getMessages: protectedProcedure
      .input(
        z.object({
          conversationId: z.number().int().positive(),
          limit: z.number().int().positive().max(500).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        // Verify conversation belongs to tenant
        const conv = await getConversationById(input.conversationId, establishment.id);
        if (!conv) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversa n\u00e3o encontrada.",
          });
        }
        return getMessagesByConversation(input.conversationId, input.limit ?? 100);
      }),

    /** Send a manual reply to a conversation via Meta Cloud API */
    reply: protectedProcedure
      .input(
        z.object({
          conversationId: z.number().int().positive(),
          message: z.string().min(1, "Mensagem não pode ser vazia").max(4096),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        // Verify conversation belongs to tenant
        const conv = await getConversationById(input.conversationId, establishment.id);
        if (!conv) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversa não encontrada.",
          });
        }

        // Get settings for sending
        const settings = await getWhatsappSettings(establishment.id);

        // Validate credentials before attempting send
        const { validateSendCredentials } = await import("./whatsappWebhook");
        const validation = validateSendCredentials(settings?.phoneNumberId, settings?.accessToken);
        if (!validation.valid) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Configuração incompleta: ${validation.errors.join("; ")}`,
          });
        }

        // Send via Meta Cloud API REAL
        const result = await sendWhatsappMessage(
          settings!.phoneNumberId!,
          settings!.accessToken!,
          conv.phone,
          input.message
        );

        // Register outbound message with real external ID or error
        const msg = await createMessage({
          conversationId: input.conversationId,
          direction: "outbound",
          messageType: "text",
          content: input.message,
          externalMessageId: result.messageId || null,
          status: result.success ? "sent" : "failed",
          metadata: result.success ? undefined : { error: result.error, errorCode: result.errorCode },
        });

        // If send failed, inform the user but still return the message record
        if (!result.success) {
          console.warn(`[WhatsApp Reply] Envio falhou para ${conv.phone}: ${result.error}`);
        }

        return msg;
      }),

    /** Close a conversation */
    closeConversation: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const establishment = await resolveTenant(ctx.user.id);
        const conv = await getConversationById(input.id, establishment.id);
        if (!conv) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversa n\u00e3o encontrada.",
          });
        }
        return closeConversation(input.id, establishment.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
