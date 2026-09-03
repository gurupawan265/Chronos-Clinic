# Submission

Fill this in and commit it. This is the first file we open.

## Links

- **GitHub repository:** https://github.com/gurupawan265/Chronos-Clinic.git
- **Live application:** <deployed URL>

## Notes for the reviewer

The system is built with Next.js 14 App Router, TypeScript, tRPC, Prisma, PostgreSQL, and NextAuth credentials. All role authorization and state transition rules are strictly enforced on the server.

## Demo credentials

All demo accounts share the password: `password123`

| Role | Email | Password | Notes |
|---|---|---|---|
| Front Desk | `alex.frontdesk@clinic.com` | `password123` | Can create slots for all providers, reassign appointments, dismiss alerts |
| Front Desk | `jordan.frontdesk@clinic.com` | `password123` | Secondary front desk coordinator |
| Provider | `dr.smith@clinic.com` | `password123` | Physical Therapy (scheduling & supporting appointments) |
| Provider | `dr.jones@clinic.com` | `password123` | Sports Medicine |
| Provider | `dr.patel@clinic.com` | `password123` | Rehabilitation |
| Provider | `dr.lee@clinic.com` | `password123` | Orthopedics |

## Stack

| Layer | What you used | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) + React 18 + Vanilla CSS | Modern server/client component paradigm, fast rendering, custom medical-grade UI without generic framework locks. |
| Backend | Node.js (Next.js App Router API Routes) + tRPC v10 + NextAuth.js | End-to-end type safety from database query to UI, robust middleware-based role enforcement, secure JWT session management. |
| Database | PostgreSQL + Prisma ORM | Relational integrity, compound unique slot constraints preventing double-booking race conditions, structured schema migrations. |
| Hosting | Vercel (App) + Supabase/Neon (PostgreSQL) | Zero-maintenance serverless hosting and managed Postgres with SSL connection pooling. |

## Goal checklist

| # | Goal | Status | Notes |
|---|---|---|---|
| 1 | Accounts and roles | Done | Front desk manages all schedules; providers strictly limited to their own appointments on the server. |
| 2 | Appointment slots | Done | 1:1 underlying record relationship. Unbooked slots are editable. Archiving hides availability without destroying appointment history. |
| 3 | Visit notes | Done | Free-text clinical notes per appointment. Editable only by authoring provider. Permanent records (no delete mutation). |
| 4 | Appointment status | Done | Strict server-side state machine. No Show only from Confirmed post-scheduled time. Cancellation only before check-in with required reason. |
| 5 | Care team | Done | Primary scheduling provider directly on Appointment; supporting providers tracked via SupportingProviderAssignment. |
| 6 | Finding appointments | Done | Server-side text search over patient name, filters for provider/status/dates, multi-column sorting, server pagination. |
| 7 | Bulk availability generation | Done | Generates recurring weekly blocks across date ranges. Reports created slots vs. skipped collisions. |
| 8 | A dashboard | Done | Headline cards, status breakdown, provider breakdown, and 8-week weekly no-show rate chart. |
| 9 | History you cannot rewrite | Done | Immutable append-only StatusHistory and timeline showing all state transitions, authoring, reasons, and notes. |
| 10 | Unconfirmed alerts | Done | Flags Requested visits <24h with badge count. Supports front-desk dismissal, with automatic reappearance within 1h of appointment. |

## How much time did you actually spend?

~6 hours on architecture, modeling, Prisma schema, tRPC routers, seed generation, UI components, and documentation.

## What would you do next, with another 12 hours?

1. Add real-time WebSocket / Server-Sent Events for instant front-desk alert badge updates.
2. Implement automated SMS / Email reminders before appointments using Twilio / Resend.
3. Build a patient-facing self-service booking portal with public slot reservations.
4. Add single-day printable Day Sheet export formatted for clinical physical clipboards.

## What are you least happy with in this codebase, and why?

Offset pagination in the appointment listing works well for current clinic volumes, but keyset/cursor-based pagination would be better at 100x scale.
