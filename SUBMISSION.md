# Submission

Fill this in and commit it. This is the first file we open.

## Links

- **GitHub repository:** https://github.com/gurupawan265/Chronos-Clinic.git
- **Live application:** https://chronosclinic.vercel.app

## Notes for the reviewer

The system is built with Next.js 14 App Router, TypeScript, tRPC v10, Prisma ORM, PostgreSQL, and NextAuth.js. All role authorization boundaries, state transition rules, and audit immutability guarantees are strictly enforced on the server. The application features a high-density clinical day-view schedule grid, real-time alert badges with 1-hour reappearance rules, and an immutable status history timeline.

## Demo credentials

All demo accounts share the password: `password123` (Also available as One-Click Quick Login buttons on the `/login` page):

| Role | Email | Password | Notes |
|---|---|---|---|
| Front Desk | `alex.frontdesk@clinic.com` | `password123` | Can create slots for all providers, reassign appointments, dismiss alerts |
| Front Desk | `jordan.frontdesk@clinic.com` | `password123` | Secondary front desk coordinator |
| Provider | `dr.patel@clinic.com` | `password123` | Dr. Anita Patel — Rehabilitation (one-click demo login) |
| Provider | `dr.smith@clinic.com` | `password123` | Dr. Sarah Smith — Physical Therapy |
| Provider | `dr.jones@clinic.com` | `password123` | Dr. David Jones — Sports Medicine |
| Provider | `dr.lee@clinic.com` | `password123` | Dr. Michael Lee — Orthopedics |

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
| 5 | Care team | Done | Primary scheduling provider directly on Appointment; supporting providers tracked via SupportingProviderAssignment with timestamps. |
| 6 | Finding appointments | Done | Server-side text search over patient name, filters for provider/status/dates, multi-column sorting, server pagination. |
| 7 | Bulk availability generation | Done | Generates recurring weekly blocks across date ranges. Reports created slots vs. skipped collisions without failing the batch. |
| 8 | A dashboard | Done | Headline cards, status breakdown, provider breakdown, and 8-week weekly no-show rate chart. |
| 9 | History you cannot rewrite | Done | Immutable append-only StatusHistory and timeline showing all state transitions, authoring, reasons, and notes. |
| 10 | Unconfirmed alerts | Done | Flags Requested visits <24h with badge count. Supports front-desk dismissal, with automatic reappearance within 1h of appointment. |

## How much time did you actually spend?

Approximately 11.5 hours total, spread across 5 focused sessions over the course of the week:
- **Session 1 (Data Modeling & Schema Foundation)**: 2.0 hours
- **Session 2 (Authentication, State Machine & tRPC Routers)**: 3.0 hours
- **Session 3 (Seed Data & Edge-Case Validation)**: 2.0 hours
- **Session 4 (Day Schedule Grid, Modals & Slide-Over Drawer UI)**: 3.0 hours
- **Session 5 (Automated Test Suite, Verification & Documentation)**: 1.5 hours

## What would you do next, with another 12 hours?

1. **Real-Time Synchronization**: Add WebSockets / Server-Sent Events (SSE) for instantaneous multi-user calendar synchronization between front-desk coordinators and clinicians.
2. **Automated Patient Notifications**: Implement automated SMS and email reminders via Twilio/Resend when appointments move from Requested to Confirmed.
3. **Patient Self-Service Booking Portal**: Build a public-facing reservation interface where patients can pick available slots directly.
4. **Printable Day Sheet View**: Add a single-day printable schedule formatted for clinical clipboards with clean `@media print` layout.

## What are you least happy with in this codebase, and why?

Offset pagination (`skip` / `take`) in the appointments directory works well for current clinic volumes, but keyset/cursor-based pagination would be more efficient at 100x scale. We documented this exact architectural trade-off and migration plan in `docs/schema.md`.
