import { router, protectedProcedure } from "../trpc";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subWeeks, format } from "date-fns";

export const dashboardRouter = router({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;
    const now = new Date();

    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const providerFilter =
      user.role === "PROVIDER" ? { schedulingProviderId: user.id } : {};

    // 1. Headline numbers
    const [
      appointmentsToday,
      checkedInRightNow,
      noShowsThisWeek,
      confirmedUpcoming,
      allAppointments,
      providers,
    ] = await Promise.all([
      // Appointments today
      ctx.prisma.appointment.count({
        where: {
          ...providerFilter,
          slot: {
            date: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        },
      }),

      // Checked in right now
      ctx.prisma.appointment.count({
        where: {
          ...providerFilter,
          status: "CHECKED_IN",
        },
      }),

      // No shows this week
      ctx.prisma.appointment.count({
        where: {
          ...providerFilter,
          status: "NO_SHOW",
          slot: {
            date: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
        },
      }),

      // Confirmed appointments upcoming
      ctx.prisma.appointment.count({
        where: {
          ...providerFilter,
          status: "CONFIRMED",
          slot: {
            date: {
              gte: todayStart,
            },
          },
        },
      }),

      // For breakdowns
      ctx.prisma.appointment.findMany({
        where: providerFilter,
        select: {
          id: true,
          status: true,
          schedulingProviderId: true,
          slot: {
            select: { date: true },
          },
        },
      }),

      // Providers list
      ctx.prisma.user.findMany({
        where: { role: "PROVIDER" },
        select: { id: true, name: true },
      }),
    ]);

    // 2. Status Breakdown
    const statusCounts: Record<string, number> = {
      REQUESTED: 0,
      CONFIRMED: 0,
      CHECKED_IN: 0,
      COMPLETED: 0,
      NO_SHOW: 0,
      CANCELLED: 0,
    };
    allAppointments.forEach((app) => {
      if (statusCounts[app.status] !== undefined) {
        statusCounts[app.status]++;
      }
    });

    // 3. Provider Breakdown
    const providerMap = new Map(providers.map((p) => [p.id, p.name]));
    const providerCounts: Record<string, { name: string; count: number }> = {};
    providers.forEach((p) => {
      providerCounts[p.id] = { name: p.name, count: 0 };
    });
    allAppointments.forEach((app) => {
      if (providerCounts[app.schedulingProviderId]) {
        providerCounts[app.schedulingProviderId].count++;
      }
    });

    // 4. 8-Week No-Show Trend
    const weeklyNoShowRates: Array<{
      weekLabel: string;
      startDate: string;
      endDate: string;
      total: number;
      noShows: number;
      rate: number;
    }> = [];

    for (let i = 7; i >= 0; i--) {
      const targetWeekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const targetWeekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });

      const weekAppointments = allAppointments.filter((app) => {
        const d = new Date(app.slot.date);
        return d >= targetWeekStart && d <= targetWeekEnd;
      });

      // Relevant appointments for no-show calculation are completed or no-show
      const resolvedAppointments = weekAppointments.filter(
        (app) => app.status === "COMPLETED" || app.status === "NO_SHOW"
      );
      const noShows = resolvedAppointments.filter((app) => app.status === "NO_SHOW").length;
      const total = resolvedAppointments.length;
      const rate = total > 0 ? Math.round((noShows / total) * 100) : 0;

      weeklyNoShowRates.push({
        weekLabel: i === 0 ? "This Week" : `${i}w ago`,
        startDate: format(targetWeekStart, "MMM d"),
        endDate: format(targetWeekEnd, "MMM d"),
        total,
        noShows,
        rate,
      });
    }

    return {
      headline: {
        appointmentsToday,
        checkedInRightNow,
        noShowsThisWeek,
        confirmedUpcoming,
      },
      byStatus: statusCounts,
      byProvider: Object.values(providerCounts),
      weeklyNoShowRates,
    };
  }),
});
