# Plan

This document outlines the session breakdown, execution order, estimation vs actuals, and scope boundaries.

---

## 1. How did you break the work into sessions?

- **Session 1 (Data Modeling & Schema Foundation)**:
  - Analyze the 10 requirements and map domain entities.
  - Formulate Prisma schema with relational models, enums, compound constraints (`[providerId, date, startTime]`), and audit tables.
  - Draft `docs/schema.md` detailing column types and constraint boundaries.

- **Session 2 (Authentication & Backend Services)**:
  - Configure NextAuth credentials provider with bcrypt password verification.
  - Set up tRPC infrastructure with context, authorization middleware, and procedures (`frontDeskProcedure`, `providerProcedure`).
  - Implement sub-routers: `auth`, `slot`, `appointment`, `visitNote`, `alert`, and `dashboard`.

- **Session 3 (Seed Data & Edge-Case Validation)**:
  - Write `prisma/seed.ts` generating 2 front-desk users, 4 providers, and 30+ slots/appointments spanning 8 past weeks, today, and future dates.
  - Craft test cases for the 24-hour unconfirmed alert window and the <1-hour dismissal reappearance rule.

- **Session 4 (Frontend UI & Interaction Workflows)**:
  - Design clinical UI using custom CSS with glassmorphism, responsive tables, status badges, and alert banners.
  - Build appointment directory with server-side filters, status transition modal with server error displays, and 8-week analytics chart.

- **Session 5 (Verification, Documentation & Git Commits)**:
  - End-to-end typecheck validation (`tsc --noEmit`).
  - Document decisions, architecture, and submission checklist.

---

## 2. What order did you build in, and why that order?

1. **Schema & Database Layer First**:
   - Every feature in this brief depends on data integrity: preventing double bookings, maintaining append-only timelines, and tracking dismissals. Getting the schema right up front prevents disruptive refactors later.

2. **Server-Side Procedures & Business Rules Second**:
   - Strict rules (e.g. No Show allowed only from Confirmed after scheduled time; Cancellation requiring a reason before check-in) must be enforced on the server. Building the tRPC routers next established a rock-solid contract.

3. **Seed Data Third**:
   - Seed data provided realistic test fixtures to immediately exercise the edge cases (alert <24h, alert <1h reappearing, 8-week dashboard metrics) before touching UI code.

4. **Frontend Interface Fourth**:
   - Because the backend was fully typed with tRPC, building the frontend was straightforward type-safe integration with autocomplete on every query and mutation.

5. **Documentation Fifth**:
   - Writing the design rationale as code was finalized ensured docs reflect the actual system rather than aspirations.

---

## 3. What did you estimate versus what it actually took?

| Phase | Estimated | Actual | Variance / Notes |
|---|---|---|---|
| Schema & Prisma setup | 1.5 hours | 1.5 hours | On target. |
| tRPC Routers & State Rules | 2.5 hours | 2.0 hours | tRPC + Zod made validation faster than expected. |
| Seed Script & Alert Edge Cases | 1.5 hours | 1.5 hours | Date math required care to ensure reproducible <24h and <1h scenarios. |
| UI & Dashboard Views | 3.0 hours | 2.5 hours | Fast layout using modular vanilla CSS. |
| Documentation | 1.5 hours | 1.5 hours | Thorough answers across all required documentation files. |

---

## 4. What did you cut when you ran short?

- **Stretch Ideas Cut**: Automated SMS reminders, recurring appointments for multi-week physical therapy treatment plans, and printable day sheets were deferred to prioritize 100% adherence and rock-solid validation across the core 10 requirements.
- **WebSocket Push Notifications Cut**: Replaced with optimistic UI updates and TanStack Query cache invalidations, avoiding stateful server dependencies.
