# Architecture

This document explains the system architecture, component interactions, runtime boundaries, request flow, and deliberate omissions.

---

## 1. What are the moving pieces, and how do they talk to each other?

The system consists of five primary layers:

1. **Client Application (Browser)**:
   - Next.js 14 App Router client components built with React 18 and Vanilla CSS.
   - Communicates with the backend using the `@trpc/react-query` client library over HTTP batch requests (`/api/trpc/*`).
   - Authenticates using NextAuth client session cookies.

2. **API & RPC Routing Layer (Server)**:
   - Next.js Route Handlers (`app/api/trpc/[trpc]/route.ts` and `app/api/auth/[...nextauth]/route.ts`).
   - Translates incoming RPC requests into tRPC procedure executions.
   - Enforces authentication and role verification (`frontDeskProcedure` vs `providerProcedure`) via middleware.

3. **Domain Business Logic & Routers**:
   - `slotRouter`: Handles slot lifecycle, collision detection, and bulk generation.
   - `appointmentRouter`: Validates state transitions (Requested -> Confirmed -> Checked In -> Completed), ensures cancellation reasons are present, and validates No Show criteria.
   - `alertRouter`: Evaluates active unconfirmed alerts (<24h) and calculates 1-hour dismissal overrides.
   - `visitNoteRouter`: Enforces authoring-only edits on clinical observations.
   - `dashboardRouter`: Aggregates real-time clinic metrics and computes 8-week weekly no-show trends.

4. **Data Access Layer (Prisma ORM)**:
   - Typesafe queries against PostgreSQL.
   - Handles multi-table atomic updates using `$transaction` (e.g., status update + history append, appointment booking + slot status update).

5. **Relational Database (PostgreSQL)**:
   - Enforces unique constraints (e.g. `[providerId, date, startTime]` preventing double-bookings), foreign keys, and enumerated types.

---

## 2. Where does each piece run?

- **Browser**: React components, TanStack Query cache, UI state, and user interaction logic run in the client's web browser.
- **Node.js Server Runtime (Next.js)**: Runs in a serverless or containerized Node.js environment (e.g. Vercel or Render). Handles session decryption, JWT verification, tRPC procedures, and Prisma query construction.
- **Managed PostgreSQL Service**: Runs on a managed cloud database (e.g. Supabase or Neon) with connection pooling.

---

## 3. Request Path for One Representative User Action (Marking an Appointment as No Show)

1. **User Action**: A front-desk staff member views an appointment past its scheduled time and clicks **"Mark No Show"**.
2. **tRPC Mutation Call**: The React component triggers `updateStatusMutation.mutate({ appointmentId, toStatus: "NO_SHOW" })`.
3. **HTTP Transport**: The tRPC client batches this mutation into a `POST /api/trpc/appointment.updateStatus` request with the user's session cookie.
4. **Authentication & Middleware**:
   - `createTRPCContext` extracts the session token and validates it via NextAuth.
   - `protectedProcedure` verifies the user is authenticated.
   - The router loads the target appointment with its slot date and start time.
5. **Business Rule Validation**:
   - Confirms current status is `CONFIRMED` (No Show cannot be set from Requested or Checked In).
   - Computes scheduled date/time from `slot.date` and `slot.startTime`.
   - Checks `now() > scheduledTime`. If `now() <= scheduledTime`, throws `TRPCError(BAD_REQUEST, "Cannot mark as No Show before scheduled time")`.
6. **Database Transaction**:
   - Updates `Appointment.status = "NO_SHOW"`.
   - Inserts a new row into `StatusHistory` with `fromStatus = "CONFIRMED"`, `toStatus = "NO_SHOW"`, `changedByUserId = session.user.id`, and `changedAt = now()`.
7. **Response & Invalidation**:
   - Returns the updated appointment record.
   - React Query invalidates the appointment list and dashboard queries, automatically updating the UI badge and metrics cards.

---

## 4. What did you decide *not* to build, and why?

1. **WebSocket Server for Live Push Notifications**:
   - *Why*: WebSockets require stateful persistent servers, which break serverless deployment models (like Vercel). Instead, TanStack Query's periodic refetching and reactive query invalidation deliver responsive UI updates with zero operational overhead.
2. **Generic Complex ORM Joins on High-Traffic Views**:
   - *Why*: Avoided joining Slot on every appointment query by denormalizing `schedulingProviderId` onto `Appointment`.
3. **Hard-Delete Endpoints for Notes and Appointments**:
   - *Why*: In healthcare software, auditability is non-negotiable. Deleting clinical data violates regulatory compliance (HIPAA). All record removals are handled through status transitions (`CANCELLED`, `ARCHIVED`, or soft-unassignment).
