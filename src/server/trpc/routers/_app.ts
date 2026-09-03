import { router } from "../trpc";
import { authRouter } from "./auth";
import { slotRouter } from "./slot";
import { appointmentRouter } from "./appointment";
import { visitNoteRouter } from "./visitNote";
import { alertRouter } from "./alert";
import { dashboardRouter } from "./dashboard";

export const appRouter = router({
  auth: authRouter,
  slot: slotRouter,
  appointment: appointmentRouter,
  visitNote: visitNoteRouter,
  alert: alertRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
