import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, frontDeskProcedure } from "../trpc";
import { addDays, format, parseISO, getDay } from "date-fns";

export const slotRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        providerId: z.string().optional(),
        date: z.string().optional(), // YYYY-MM-DD
        status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const targetProviderId =
        user.role === "PROVIDER" ? user.id : input.providerId;

      return ctx.prisma.slot.findMany({
        where: {
          providerId: targetProviderId,
          ...(input.date
            ? {
                date: new Date(input.date),
              }
            : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          provider: {
            select: { id: true, name: true, email: true },
          },
          appointment: {
            select: {
              id: true,
              patientName: true,
              patientContact: true,
              status: true,
            },
          },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const slot = await ctx.prisma.slot.findUnique({
        where: { id: input.id },
        include: {
          provider: {
            select: { id: true, name: true, email: true },
          },
          appointment: true,
        },
      });

      if (!slot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Slot not found." });
      }

      if (ctx.session.user.role === "PROVIDER" && slot.providerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Providers can only access slots on their own schedule.",
        });
      }

      return slot;
    }),

  create: protectedProcedure
    .input(
      z.object({
        providerId: z.string(),
        date: z.string(), // "YYYY-MM-DD"
        startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
        durationMinutes: z.number().int().positive().default(30),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      // Rule: FRONT_DESK can create slots for any provider; PROVIDER cannot create slots for others
      if (user.role === "PROVIDER" && input.providerId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access restricted: Providers cannot create slots for other providers. Only Front Desk staff can create slots for any provider.",
        });
      }

      const slotDate = new Date(input.date);

      // Check collision
      const existing = await ctx.prisma.slot.findUnique({
        where: {
          providerId_date_startTime: {
            providerId: input.providerId,
            date: slotDate,
            startTime: input.startTime,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A slot already exists for this provider on ${input.date} at ${input.startTime}.`,
        });
      }

      return ctx.prisma.slot.create({
        data: {
          providerId: input.providerId,
          date: slotDate,
          startTime: input.startTime,
          durationMinutes: input.durationMinutes,
          status: "ACTIVE",
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        date: z.string().optional(),
        startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        durationMinutes: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slot = await ctx.prisma.slot.findUnique({
        where: { id: input.id },
        include: { appointment: true },
      });

      if (!slot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Slot not found." });
      }

      // Rule: Providers cannot edit another provider's slot
      if (ctx.session.user.role === "PROVIDER" && slot.providerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Providers can only modify their own slots.",
        });
      }

      // Rule: Cannot edit once booked
      if (slot.appointment) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot edit a slot that has already been booked as an appointment.",
        });
      }

      return ctx.prisma.slot.update({
        where: { id: input.id },
        data: {
          ...(input.date ? { date: new Date(input.date) } : {}),
          ...(input.startTime ? { startTime: input.startTime } : {}),
          ...(input.durationMinutes ? { durationMinutes: input.durationMinutes } : {}),
        },
      });
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const slot = await ctx.prisma.slot.findUnique({ where: { id: input.id } });
      if (!slot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Slot not found." });
      }

      if (ctx.session.user.role === "PROVIDER" && slot.providerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Providers can only archive their own slots.",
        });
      }

      return ctx.prisma.slot.update({
        where: { id: input.id },
        data: { status: "ARCHIVED" },
      });
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const slot = await ctx.prisma.slot.findUnique({ where: { id: input.id } });
      if (!slot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Slot not found." });
      }

      if (ctx.session.user.role === "PROVIDER" && slot.providerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Providers can only restore their own slots.",
        });
      }

      return ctx.prisma.slot.update({
        where: { id: input.id },
        data: { status: "ACTIVE" },
      });
    }),

  bulkGenerate: protectedProcedure
    .input(
      z.object({
        providerId: z.string(),
        startDate: z.string(), // "YYYY-MM-DD"
        endDate: z.string(),   // "YYYY-MM-DD"
        daysOfWeek: z.array(z.number().min(0).max(6)), // 0 = Sunday, 1 = Monday, etc.
        startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        durationMinutes: z.number().int().positive().default(30).optional(),
        timeBlocks: z
          .array(
            z.object({
              startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
              durationMinutes: z.number().int().positive().default(30),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      // RBAC: Front Desk can bulk generate for any provider; Providers only for themselves
      if (user.role === "PROVIDER" && input.providerId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Providers can only generate availability slots for themselves.",
        });
      }

      const start = parseISO(input.startDate);
      const end = parseISO(input.endDate);

      if (start > end) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Start date must be before or equal to end date.",
        });
      }

      // Resolve time blocks: either from timeBlocks array or single (startTime, durationMinutes)
      const blocks =
        input.timeBlocks && input.timeBlocks.length > 0
          ? input.timeBlocks
          : input.startTime
          ? [{ startTime: input.startTime, durationMinutes: input.durationMinutes || 30 }]
          : [];

      if (blocks.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least one start time or time block must be specified.",
        });
      }

      const created: Array<{ date: string; startTime: string }> = [];
      const skipped: Array<{ date: string; startTime: string; reason: string }> = [];

      let currentDate = start;
      while (currentDate <= end) {
        const dayOfWeek = getDay(currentDate);
        if (input.daysOfWeek.includes(dayOfWeek)) {
          const dateStr = format(currentDate, "yyyy-MM-dd");
          const dateObj = new Date(dateStr);

          for (const block of blocks) {
            // Check collision with existing slot or booked appointment
            const existingSlot = await ctx.prisma.slot.findUnique({
              where: {
                providerId_date_startTime: {
                  providerId: input.providerId,
                  date: dateObj,
                  startTime: block.startTime,
                },
              },
              include: { appointment: true },
            });

            if (existingSlot) {
              skipped.push({
                date: dateStr,
                startTime: block.startTime,
                reason: existingSlot.appointment
                  ? `Collides with existing booked appointment for that provider (Patient: ${existingSlot.appointment.patientName || "Booked"}).`
                  : "Collides with existing availability slot.",
              });
            } else {
              await ctx.prisma.slot.create({
                data: {
                  providerId: input.providerId,
                  date: dateObj,
                  startTime: block.startTime,
                  durationMinutes: block.durationMinutes,
                  status: "ACTIVE",
                },
              });
              created.push({
                date: dateStr,
                startTime: block.startTime,
              });
            }
          }
        }
        currentDate = addDays(currentDate, 1);
      }

      return {
        createdCount: created.length,
        skippedCount: skipped.length,
        created,
        skipped,
      };
    }),

  exportDayScheduleCsv: protectedProcedure
    .input(
      z.object({
        date: z.string(), // "YYYY-MM-DD"
        providerId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const targetDate = new Date(input.date);

      // Provider can only export their own schedule
      const effectiveProviderId =
        user.role === "PROVIDER" ? user.id : input.providerId || undefined;

      const slots = await ctx.prisma.slot.findMany({
        where: {
          date: targetDate,
          ...(effectiveProviderId ? { providerId: effectiveProviderId } : {}),
        },
        include: {
          provider: { select: { name: true } },
          appointment: { select: { patientName: true, status: true } },
        },
        orderBy: [
          { startTime: "asc" },
          { provider: { name: "asc" } },
        ],
      });

      // Helper to escape CSV values
      const escapeCsv = (str: string) => {
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Header row: Provider, Time, Patient, Status
      const headers = ["Provider", "Time", "Patient", "Status"];
      const rows = slots.map((s) => {
        const providerName = s.provider.name;
        const time = s.startTime;
        const patient = s.appointment ? s.appointment.patientName : "(Open Slot)";
        const status = s.appointment
          ? s.appointment.status
          : s.status === "ACTIVE"
          ? "AVAILABLE"
          : s.status;

        return [escapeCsv(providerName), escapeCsv(time), escapeCsv(patient), escapeCsv(status)].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const filename = `schedule-${input.date}${effectiveProviderId ? "-provider" : "-all"}.csv`;

      return {
        csvContent,
        filename,
        totalRows: slots.length,
      };
    }),
});
