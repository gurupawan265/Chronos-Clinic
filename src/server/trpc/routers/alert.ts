import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, frontDeskProcedure } from "../trpc";
import { getSlotScheduledDateTime } from "./appointment";

export const alertRouter = router({
  getUnconfirmedAlerts: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    // Badge and alerts are visible to front desk (or providers for their own schedule)
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h from now

    // Find all REQUESTED appointments
    const appointments = await ctx.prisma.appointment.findMany({
      where: {
        status: "REQUESTED",
        ...(user.role === "PROVIDER"
          ? { schedulingProviderId: user.id }
          : {}),
      },
      include: {
        slot: true,
        schedulingProvider: {
          select: { id: true, name: true, email: true },
        },
        alertDismissals: {
          orderBy: { dismissedAt: "desc" },
        },
      },
    });

    const activeAlerts = appointments
      .map((app) => {
        const scheduledTime = getSlotScheduledDateTime(
          app.slot.date,
          app.slot.startTime
        );

        const timeDiffMs = scheduledTime.getTime() - now.getTime();
        const hoursUntilScheduled = timeDiffMs / (1000 * 60 * 60);

        // Within 24 hours of scheduled time
        // Note: appointment must be upcoming within 24 hours or starting very soon
        const isWithin24Hours =
          scheduledTime <= windowEnd && scheduledTime >= new Date(now.getTime() - 2 * 60 * 60 * 1000);

        if (!isWithin24Hours) {
          return null;
        }

        // Check if dismissed for this scheduled time
        const matchingDismissal = app.alertDismissals.find(
          (d) =>
            Math.abs(d.dismissedForScheduledAt.getTime() - scheduledTime.getTime()) < 1000
        );

        // Rule: If within 1 hour of scheduled time (hoursUntilScheduled <= 1),
        // the alert reappears regardless of any earlier dismissal!
        const isWithinOneHour = hoursUntilScheduled <= 1;

        if (matchingDismissal && !isWithinOneHour) {
          // Dismissed during 24h - 1h window and NOT yet within 1 hour
          return null;
        }

        return {
          appointment: app,
          scheduledTime,
          hoursUntilScheduled,
          isWithinOneHour,
          wasDismissedEarlier: !!matchingDismissal,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

    return {
      alerts: activeAlerts,
      count: activeAlerts.length,
    };
  }),

  dismiss: frontDeskProcedure
    .input(z.object({ appointmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const appointment = await ctx.prisma.appointment.findUnique({
        where: { id: input.appointmentId },
        include: { slot: true },
      });

      if (!appointment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found." });
      }

      const scheduledTime = getSlotScheduledDateTime(
        appointment.slot.date,
        appointment.slot.startTime
      );

      return ctx.prisma.alertDismissal.create({
        data: {
          appointmentId: input.appointmentId,
          dismissedAt: new Date(),
          dismissedForScheduledAt: scheduledTime,
          dismissedByUserId: ctx.session.user.id,
        },
      });
    }),
});
