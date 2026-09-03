# Decisions

Log the decisions that actually shaped this codebase — the ones where a real alternative existed and you picked one.

## Decision 1: Relational 1:1 Separation of Slot and Appointment

- **Chose:** Modeling `Slot` and `Appointment` as distinct relational entities connected via a 1:1 relation (`Appointment.slotId` unique).
- **Rejected:** A single monolithic `SlotOrAppointment` table with nullable patient fields and a boolean `isBooked`.
- **Why:** In a clinic, availability exists independently of bookings. A single merged table creates messy nullable fields (`patientName`, `cancellationReason`, etc.) on unbooked slots and makes archiving complex. With a 1:1 relation, archiving a slot simply sets `Slot.status = ARCHIVED` without touching the integrity or clinical history of the booked appointment.

## Decision 2: tRPC for End-to-End Type Safety

- **Chose:** tRPC v10 over Next.js App Router Route Handlers.
- **Rejected:** Traditional REST API endpoints using standard `fetch` or Axios.
- **Why:** Clinical scheduling has strict state machine validations, multi-field filters, and role restrictions. tRPC provides full type inference from Prisma queries directly to React hooks without manual schema synchronization or client SDK generation.

## Decision 3: Relational Append-Only `StatusHistory` Table

- **Chose:** A dedicated normalized `StatusHistory` table for every state transition.
- **Rejected:** Storing history as a `history JSONB` array column on `Appointment`.
- **Why:** Medical scheduling requires tamper-evident auditability. A relational table enforces foreign key relationships with the user who made the change (`changedByUserId`), supports strict database indexing on transition timestamps (`changedAt`), and prevents concurrent write races from wiping out historical entries.

## Decision 4: Snapshotting `dismissedForScheduledAt` on Alert Dismissals

- **Chose:** Explicitly persisting `dismissedForScheduledAt` alongside `dismissedAt` on each `AlertDismissal`.
- **Rejected:** A simple `isDismissed Boolean` flag on the `Appointment` table.
- **Why:** The system requires that if an appointment is still unconfirmed 1 hour before its scheduled time, the alert must reappear regardless of an earlier dismissal. Snapshotting `dismissedForScheduledAt` ensures we can accurately check whether the appointment is within 1 hour of that specific time block, and automatically invalidates the dismissal if the appointment is ever rescheduled to a different day or time.

## Decision 5: Soft-Unassignment for Supporting Providers

- **Chose:** Retaining `SupportingProviderAssignment` join rows and setting `unassignedAt` when a care-team member is removed.
- **Rejected:** Hard-deleting rows (`DELETE FROM SupportingProviderAssignment WHERE ...`).
- **Why:** Preserves the complete timeline of care-team participation for Goal 9 ("every supporting-provider assignment and unassignment").
- **Later reversed:** Initially considered hard-deleting the join record upon removal and only writing an event string to `StatusHistory`. Later reversed this decision because storing `assignedAt` and `unassignedAt` on the join record itself allows querying who was actively on the care team at any historical point in time.
