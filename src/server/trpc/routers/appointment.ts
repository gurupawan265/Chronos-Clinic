import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { AppointmentStatus, Prisma } from "@prisma/client";

// Helper to compute scheduled Date from slot date and startTime ("HH:mm")
export function getSlotScheduledDateTime(date: Date, startTime: string): Date {
  const [hours, minutes] = startTime.split(":").map(Number);
  const scheduled = new Date(date);
  scheduled.setHours(hours, minutes, 0, 0);
  return scheduled;
}

export const appointmentRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        providerId: z.string().optional(),
        status: z.nativeEnum(AppointmentStatus).optional(),
        startDate: z.string().optional(), // YYYY-MM-DD
        endDate: z.string().optional(),   // YYYY-MM-DD
        sortBy: z.enum(["dateTime", "status", "provider"]).default("dateTime"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      // Base where clause
      const where: Prisma.AppointmentWhereInput = {};

      // If user is a PROVIDER: they can only see appointments where they are
      // either the scheduling provider OR an active supporting provider
      if (user.role === "PROVIDER") {
        where.OR = [
          { schedulingProviderId: user.id },
          {
            supportingProviders: {
              some: {
                providerId: user.id,
                unassignedAt: null,
              },
            },
          },
        ];
      } else if (input.providerId) {
        // Front desk filtered by specific provider
        where.OR = [
          { schedulingProviderId: input.providerId },
          {
            supportingProviders: {
              some: {
                providerId: input.providerId,
                unassignedAt: null,
              },
            },
          },
        ];
      }

      if (input.status) {
        where.status = input.status;
      }

      if (input.search && input.search.trim() !== "") {
        where.patientName = {
          contains: input.search.trim(),
          mode: "insensitive",
        };
      }

      if (input.startDate || input.endDate) {
        where.slot = {
          ...(where.slot as Prisma.SlotWhereInput),
          date: {
            ...(input.startDate ? { gte: new Date(input.startDate) } : {}),
            ...(input.endDate ? { lte: new Date(input.endDate) } : {}),
          },
        };
      }

      // Sorting logic
      let orderBy: Prisma.AppointmentOrderByWithRelationInput = {};
      if (input.sortBy === "dateTime") {
        orderBy = {
          slot: {
            date: input.sortOrder,
          },
        };
      } else if (input.sortBy === "status") {
        orderBy = { status: input.sortOrder };
      } else if (input.sortBy === "provider") {
        orderBy = {
          schedulingProvider: {
            name: input.sortOrder,
          },
        };
      }

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const [totalCount, appointments] = await Promise.all([
        ctx.prisma.appointment.count({ where }),
        ctx.prisma.appointment.findMany({
          where,
          include: {
            slot: true,
            schedulingProvider: {
              select: { id: true, name: true, email: true },
            },
            supportingProviders: {
              where: { unassignedAt: null },
              include: {
                provider: { select: { id: true, name: true, email: true } },
              },
            },
          },
          orderBy,
          skip,
          take,
        }),
      ]);

      return {
        items: appointments,
        totalCount,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(totalCount / input.pageSize),
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      const appointment = await ctx.prisma.appointment.findUnique({
        where: { id: input.id },
        include: {
          slot: true,
          schedulingProvider: {
            select: { id: true, name: true, email: true },
          },
          supportingProviders: {
            include: {
              provider: { select: { id: true, name: true, email: true } },
            },
            orderBy: { assignedAt: "asc" },
          },
          visitNotes: {
            include: {
              authorProvider: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "asc" },
          },
          statusHistory: {
            include: {
              changedByUser: { select: { id: true, name: true, role: true } },
            },
            orderBy: { changedAt: "asc" },
          },
          alertDismissals: {
            include: {
              dismissedByUser: { select: { id: true, name: true } },
            },
            orderBy: { dismissedAt: "desc" },
          },
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found.",
        });
      }

      // Check provider access
      if (user.role === "PROVIDER") {
        const isSchedulingProvider = appointment.schedulingProviderId === user.id;
        const isSupportingProvider = appointment.supportingProviders.some(
          (sp) => sp.providerId === user.id && sp.unassignedAt === null
        );
        if (!isSchedulingProvider && !isSupportingProvider) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only view appointments for your own schedule.",
          });
        }
      }

      return appointment;
    }),

  bookSlot: protectedProcedure
    .input(
      z.object({
        slotId: z.string(),
        patientName: z.string().min(1, "Patient name is required."),
        patientContact: z.string().min(1, "Patient contact is required."),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slot = await ctx.prisma.slot.findUnique({
        where: { id: input.slotId },
        include: { appointment: true },
      });

      if (!slot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Slot not found." });
      }

      if (slot.status === "ARCHIVED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot book an archived slot. Please restore it first.",
        });
      }

      if (slot.appointment) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This slot is already booked.",
        });
      }

      const user = ctx.session.user;
      if (user.role === "PROVIDER" && slot.providerId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Providers can only book slots for themselves.",
        });
      }

      return ctx.prisma.$transaction(async (tx) => {
        const appointment = await tx.appointment.create({
          data: {
            slotId: slot.id,
            schedulingProviderId: slot.providerId,
            patientName: input.patientName,
            patientContact: input.patientContact,
            status: "REQUESTED",
          },
        });

        // Record initial status in history
        await tx.statusHistory.create({
          data: {
            appointmentId: appointment.id,
            fromStatus: null,
            toStatus: "REQUESTED",
            changedByUserId: user.id,
            reason: "Initial booking request created.",
          },
        });

        return appointment;
      });
    }),

  updatePatientDetails: protectedProcedure
    .input(
      z.object({
        appointmentId: z.string(),
        patientName: z.string().min(1, "Patient name is required."),
        patientContact: z.string().min(1, "Patient contact is required."),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      const appointment = await ctx.prisma.appointment.findUnique({
        where: { id: input.appointmentId },
        include: {
          supportingProviders: {
            where: { unassignedAt: null },
          },
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found.",
        });
      }

      // RBAC: FRONT_DESK can edit any appointment.
      // PROVIDER can only edit on their own schedule (as scheduling or supporting provider).
      if (user.role === "PROVIDER") {
        const isScheduling = appointment.schedulingProviderId === user.id;
        const isSupporting = appointment.supportingProviders.some(
          (sp) => sp.providerId === user.id
        );
        if (!isScheduling && !isSupporting) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Access restricted: Providers can only edit appointments on their own schedule.",
          });
        }
      }

      return ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.appointment.update({
          where: { id: input.appointmentId },
          data: {
            patientName: input.patientName,
            patientContact: input.patientContact,
          },
        });

        await tx.statusHistory.create({
          data: {
            appointmentId: input.appointmentId,
            fromStatus: appointment.status,
            toStatus: appointment.status,
            changedByUserId: user.id,
            reason: `Updated patient details: name to '${input.patientName}', contact to '${input.patientContact}'.`,
          },
        });

        return updated;
      });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        appointmentId: z.string(),
        toStatus: z.nativeEnum(AppointmentStatus),
        cancellationReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      const appointment = await ctx.prisma.appointment.findUnique({
        where: { id: input.appointmentId },
        include: {
          slot: true,
          supportingProviders: {
            where: { unassignedAt: null },
          },
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found.",
        });
      }

      // Rule: FRONT_DESK can confirm/cancel any appointment.
      // PROVIDER can only act on their own schedule (as scheduling or supporting provider).
      if (user.role === "PROVIDER") {
        const isScheduling = appointment.schedulingProviderId === user.id;
        const isSupporting = appointment.supportingProviders.some(
          (sp) => sp.providerId === user.id
        );
        if (!isScheduling && !isSupporting) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Access restricted: Providers can only see and act on their own schedule (as scheduling or supporting provider).",
          });
        }
      }

      const fromStatus = appointment.status;
      const { toStatus } = input;

      if (fromStatus === toStatus) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Appointment is already in ${toStatus} status.`,
        });
      }

      // Terminal state check
      if (fromStatus === "COMPLETED" || fromStatus === "NO_SHOW" || fromStatus === "CANCELLED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition an appointment from terminal status ${fromStatus}.`,
        });
      }

      // --- Rule Enforcement as specified in Goal 4 ---

      // 1. Cancellation rules:
      // "Cancellation is permitted only before check-in and must include a reason — once a patient has checked in, the appointment can no longer be cancelled."
      if (toStatus === "CANCELLED") {
        if (fromStatus === "CHECKED_IN") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cancellation is not permitted once a patient has checked in.",
          });
        }
        if (!input.cancellationReason || input.cancellationReason.trim() === "") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A cancellation reason must be provided.",
          });
        }
      }

      // 2. No Show rules:
      // "It can be marked No Show only from Confirmed, and only after the slot's scheduled time has passed."
      else if (toStatus === "NO_SHOW") {
        if (fromStatus !== "CONFIRMED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "An appointment can only be marked as No Show from Confirmed status.",
          });
        }
        const scheduledTime = getSlotScheduledDateTime(
          appointment.slot.date,
          appointment.slot.startTime
        );
        const now = new Date();
        if (now <= scheduledTime) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot mark as No Show before the scheduled appointment time (${scheduledTime.toLocaleString()}).`,
          });
        }
      }

      // 3. Standard progression: Requested -> Confirmed -> Checked In -> Completed
      else if (toStatus === "CONFIRMED") {
        if (fromStatus !== "REQUESTED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot confirm appointment from ${fromStatus} status. Progression requires Requested -> Confirmed.`,
          });
        }
      } else if (toStatus === "CHECKED_IN") {
        if (fromStatus !== "CONFIRMED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot check in patient from ${fromStatus} status. Progression requires Confirmed -> Checked In.`,
          });
        }
      } else if (toStatus === "COMPLETED") {
        if (fromStatus !== "CHECKED_IN") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot complete appointment from ${fromStatus} status. Progression requires Checked In -> Completed.`,
          });
        }
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Illegal status transition from ${fromStatus} to ${toStatus}.`,
        });
      }

      // Execute update and append to StatusHistory
      return ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.appointment.update({
          where: { id: input.appointmentId },
          data: {
            status: toStatus,
            cancellationReason:
              toStatus === "CANCELLED" ? input.cancellationReason : appointment.cancellationReason,
          },
        });

        await tx.statusHistory.create({
          data: {
            appointmentId: input.appointmentId,
            fromStatus,
            toStatus,
            changedByUserId: user.id,
            reason: toStatus === "CANCELLED" ? input.cancellationReason : null,
          },
        });

        return updated;
      });
    }),

  reassign: protectedProcedure
    .input(
      z.object({
        appointmentId: z.string(),
        newProviderId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      // Rule: "Front-desk staff can reassign appointments between providers.
      // Providers cannot reassign an appointment away from themselves."
      if (user.role !== "FRONT_DESK") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Access restricted: Providers cannot reassign an appointment away from themselves. Only Front Desk staff can reassign scheduling providers between providers.",
        });
      }

      const appointment = await ctx.prisma.appointment.findUnique({
        where: { id: input.appointmentId },
        include: { slot: true },
      });

      if (!appointment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found." });
      }

      const newProvider = await ctx.prisma.user.findUnique({
        where: { id: input.newProviderId },
      });

      if (!newProvider || newProvider.role !== "PROVIDER") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Target provider does not exist." });
      }

      return ctx.prisma.$transaction(async (tx) => {
        // Update both the Appointment's schedulingProviderId and the underlying Slot's providerId
        await tx.slot.update({
          where: { id: appointment.slotId },
          data: { providerId: input.newProviderId },
        });

        const updated = await tx.appointment.update({
          where: { id: input.appointmentId },
          data: { schedulingProviderId: input.newProviderId },
        });

        await tx.statusHistory.create({
          data: {
            appointmentId: input.appointmentId,
            fromStatus: appointment.status,
            toStatus: appointment.status,
            changedByUserId: user.id,
            reason: `Reassigned from previous provider to ${newProvider.name}.`,
          },
        });

        return updated;
      });
    }),

  assignSupportingProvider: protectedProcedure
    .input(
      z.object({
        appointmentId: z.string(),
        providerId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const appointment = await ctx.prisma.appointment.findUnique({
        where: { id: input.appointmentId },
      });

      if (!appointment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found." });
      }

      if (user.role === "PROVIDER" && appointment.schedulingProviderId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the scheduling provider or front desk can manage the care team.",
        });
      }

      // Check if already active
      const existing = await ctx.prisma.supportingProviderAssignment.findFirst({
        where: {
          appointmentId: input.appointmentId,
          providerId: input.providerId,
          unassignedAt: null,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This provider is already assigned as a supporting provider.",
        });
      }

      return ctx.prisma.supportingProviderAssignment.create({
        data: {
          appointmentId: input.appointmentId,
          providerId: input.providerId,
          assignedAt: new Date(),
        },
      });
    }),

  unassignSupportingProvider: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.prisma.supportingProviderAssignment.findUnique({
        where: { id: input.assignmentId },
        include: { appointment: true },
      });

      if (!assignment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found." });
      }

      const user = ctx.session.user;
      if (user.role === "PROVIDER" && assignment.appointment.schedulingProviderId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the scheduling provider or front desk can unassign team members.",
        });
      }

      // Immutable history: soft-unassign by stamping unassignedAt
      return ctx.prisma.supportingProviderAssignment.update({
        where: { id: input.assignmentId },
        data: {
          unassignedAt: new Date(),
        },
      });
    }),
});
