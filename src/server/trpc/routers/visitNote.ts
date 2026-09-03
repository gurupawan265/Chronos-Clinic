import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, providerProcedure } from "../trpc";

export const visitNoteRouter = router({
  getByAppointment: protectedProcedure
    .input(z.object({ appointmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.visitNote.findMany({
        where: { appointmentId: input.appointmentId },
        include: {
          authorProvider: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  create: providerProcedure
    .input(
      z.object({
        appointmentId: z.string(),
        content: z.string().min(1, "Note content cannot be empty."),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      const appointment = await ctx.prisma.appointment.findUnique({
        where: { id: input.appointmentId },
        include: { supportingProviders: true },
      });

      if (!appointment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found." });
      }

      // Check if provider is primary or supporting provider on this appointment
      const isPrimary = appointment.schedulingProviderId === user.id;
      const isSupporting = appointment.supportingProviders.some(
        (sp) => sp.providerId === user.id && sp.unassignedAt === null
      );

      if (!isPrimary && !isSupporting) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only write visit notes for appointments you are assigned to.",
        });
      }

      return ctx.prisma.visitNote.create({
        data: {
          appointmentId: input.appointmentId,
          authorProviderId: user.id,
          content: input.content,
        },
        include: {
          authorProvider: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    }),

  update: providerProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string().min(1, "Note content cannot be empty."),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      const existing = await ctx.prisma.visitNote.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Visit note not found." });
      }

      // Rule: Editable ONLY by the authoring provider!
      if (existing.authorProviderId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Visit notes can only be edited by the provider who wrote them.",
        });
      }

      return ctx.prisma.visitNote.update({
        where: { id: input.id },
        data: {
          content: input.content,
        },
      });
    }),

  // NOTE: Per assignment rules, no delete mutation is exposed (Visit notes are permanent records)
});
