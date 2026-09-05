# AI Prompts & Engineering Iteration Log

This document logs the AI collaboration workflow used during the development of Chronos Clinic. It illustrates how AI was utilized for scaffolding and accelerated development, paired with critical developer review, architectural corrections, and edge-case hardening.

---

## 1. Schema Architecture & Domain Modeling

### Engineering Context & Intent
We needed to design a clinical relational model supporting multi-provider scheduling, role isolation, immutable audit trails, and care-team coordination.

### Prompt
> "I am designing a PostgreSQL schema using Prisma for a multi-provider clinical scheduling system ('Chronos Clinic').
> Key domain requirements:
> - Roles: FRONT_DESK (manages all provider calendars) and PROVIDER (view restricted to own schedule).
> - Slots & Appointments: An unbooked Slot represents provider availability. When booked, it links 1:1 to an Appointment (same underlying record).
> - Double-booking must be impossible at the database level.
> - Clinical notes: Authored by a provider, editable only by that author, never deleted.
> - History: Append-only audit log of all status transitions (fromStatus, toStatus, changedByUserId, reason, timestamp).
> - Care Team: Many-to-many relationship for supporting providers on an appointment, preserving history of who joined and left.
> - Unconfirmed Alerts: Requested appointments <24h out must alert front desk, with support for dismissal, but if unconfirmed within 1h of scheduled start, it must reappear even if dismissed earlier.
> Please generate the Prisma schema and explain the relational trade-offs."

### Initial AI Output
The AI suggested a clean initial schema with `User`, `Slot`, `Appointment`, and `VisitNote`. However, for supporting providers, it proposed a standard implicit `@relation("CareTeam")` many-to-many join table, and for alert dismissals it proposed a simple `isDismissed: Boolean` column on `Appointment`.

### Developer Critique & Refinements Made
1. **Implicit Many-to-Many Rejected**: An implicit join table cannot store temporal metadata. When a supporting provider is removed, an implicit relation simply deletes the row, permanently erasing their participation from the historical record (violating Goal 9). We replaced it with an explicit join model `SupportingProviderAssignment` containing `assignedAt` and nullable `unassignedAt` to preserve the complete audit history.
2. **Boolean Dismissal Rejected**: A boolean `isDismissed` flag on `Appointment` cannot handle the 1-hour reappearance rule or rescheduling. We introduced a dedicated `AlertDismissal` entity snapshotting `dismissedForScheduledAt`, allowing dynamic temporal evaluation at query time.
3. **Compound Slot Constraint**: Added `@@unique([providerId, date, startTime])` to ensure the database engine rejects any simultaneous booking race conditions.

---

## 2. Clinical State Machine & Transition Safety Guards

### Engineering Context & Intent
Healthcare appointment lifecycles require strict, auditable progression rules. Transitioning between states cannot be left to arbitrary UI toggles; it must be enforced by a validated state machine on the server.

### Prompt
> "Implement an appointment state machine module in TypeScript for Chronos Clinic.
> States: REQUESTED, CONFIRMED, CHECKED_IN, COMPLETED, NO_SHOW, CANCELLED.
> Rules to enforce strictly:
> 1. Normal progression moves forward one step only: REQUESTED -> CONFIRMED -> CHECKED_IN -> COMPLETED.
> 2. No Show is only reachable from CONFIRMED, and ONLY after the scheduled start time has passed.
> 3. Cancellation is allowed from REQUESTED or CONFIRMED, but strictly requires a non-empty cancellation reason.
> 4. Once a patient is CHECKED_IN, cancellation is blocked (patient is physically present).
> 5. COMPLETED, NO_SHOW, and CANCELLED are terminal states with zero transitions.
> Return custom error classes for each violation so the UI and API return clear, contextual messages."

### Initial AI Output
The AI produced an `isValidTransition` function using a basic switch statement and generic `Error` instances. The time comparison for No-Show simply compared `new Date() > appointment.date`, ignoring the slot's `startTime` string ("HH:mm").

### Developer Critique & Refinements Made
1. **Granular Temporal Resolution**: Comparing just `appointment.date` would allow marking a patient "No Show" at 9:00 AM for an appointment scheduled at 4:00 PM on the same date. We implemented `getSlotScheduledDateTime(date, startTime)` to combine the calendar date with the 24-hour time string down to the minute:
   ```ts
   const [hours, minutes] = startTime.split(":").map(Number);
   const scheduled = new Date(date);
   scheduled.setHours(hours, minutes, 0, 0);
   if (now.getTime() <= scheduled.getTime()) {
     throw new EarlyNoShowError(scheduled);
   }
   ```
2. **Explicit Transition Map**: Replaced hard-to-maintain nested `switch` blocks with a declarative `LEGAL_TRANSITIONS_MAP` constant mapping each `AppointmentStatus` to its allowed targets.
3. **Typed Domain Errors**: Implemented `InvalidStatusTransitionError`, `EarlyNoShowError`, `CancellationReasonRequiredError`, and `CancellationBlockedError` to supply meaningful client-facing error feedback.

---

## 3. Dynamic Unconfirmed Alert Engine & The 1-Hour Reappearance Rule

### Engineering Context & Intent
Goal 10 requires alerting the front desk about unconfirmed appointments approaching within 24 hours, allowing dismissals, but forcing the alert to reappear within 1 hour of scheduled start time.

### Prompt
> "Write a tRPC query procedure for `alert.getUnconfirmedAlerts` in Chronos Clinic.
> It needs to find appointments in `REQUESTED` status where `scheduledStartTime` is between `now` and `now + 24 hours`.
> Requirements:
> - Sort by urgency (nearest scheduled start time first).
> - If an alert was dismissed by front desk via `AlertDismissal`, suppress it EXCEPT when `scheduledStartTime - now <= 1 hour`.
> - If within 1 hour, the alert must reappear with an urgency indicator."

### Initial AI Output
The AI drafted a Prisma query that attempted to filter out dismissed alerts directly in SQL `where: { alertDismissals: { none: {} } }`.

### Developer Critique & Refinements Made
The AI's SQL-level `none: {}` filter completely excluded all previously dismissed appointments from the result set, making it impossible for them to ever reappear within the 1-hour window.

We restructured the logic into a two-stage evaluation pipeline:
1. Fetch all `REQUESTED` appointments within the 24-hour window, including their latest `alertDismissal` record.
2. In the domain layer, calculate the exact floating-point hour difference `(scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60)`.
3. If dismissed earlier and `hoursUntilScheduled > 1`, filter it out.
4. If `hoursUntilScheduled <= 1`, surface the alert and set an explicit flag `reappeared: true`, rendering an alert badge in the UI informing the coordinator that the visit is imminent.

---

## 4. Bulk Availability Generator with Collision Reporting

### Engineering Context & Intent
Front-desk staff need to generate recurring availability blocks across multi-week date ranges without existing appointments being overwritten or corrupted.

### Prompt
> "Implement a tRPC mutation `slot.bulkGenerate` that generates availability slots for a provider across a date range for specified days of the week.
> Requirements:
> - Parameters: providerId, startDate, endDate, daysOfWeek (0-6), startTime ('HH:mm'), durationMinutes.
> - Must check for collisions against existing slots for that provider.
> - Goal 7 requirement: Do not abort the entire batch on a collision. Instead, report which slots were created and which were skipped."

### Initial AI Output
The AI wrote a loop that checked collision and called `prisma.slot.create` individually. However, upon encountering a collision, it threw a `TRPCError(CONFLICT)`, causing the entire transaction to abort and leaving zero slots generated.

### Developer Critique & Refinements Made
We corrected the error-handling model to match the specification:
1. Replaced the throwing behavior with an accumulator pattern collecting `{ createdCount, skippedCount, created: [...], skipped: [...] }`.
2. Wrapped the generation in a Prisma transaction that inserts valid slots while tracking collisions in the skipped report.
3. Enhanced the frontend `BulkAvailabilityGenerator.tsx` component to render a detailed summary card breaking down successfully scheduled slots versus collided timestamps.

---

## 5. Day Schedule Grid Tile Prefill & React State Synchronization

### Engineering Context & Intent
When clicking an empty tile on the day schedule grid (e.g. 14:30), the slot creation modal was opening with the default time (09:00) instead of the exact time tile clicked.

### Prompt
> "In our DayScheduleGrid component, users can click on an empty time tile (e.g. 14:30 for Dr. Anita Patel).
> We trigger `onCreateSlotAtTime(providerId, time)` and pass `defaultTime={createSlotPrefill.time}` to `CreateSlotModal`.
> However, the modal still displays the default '09:00' when opened.
> Explain why this happens in React and fix it so the clicked time is always accurately pre-filled."

### Initial AI Output
The AI suggested setting `defaultValue` instead of `value` on the HTML input element.

### Developer Critique & Refinements Made
Switching to `defaultValue` does not resolve the issue in controlled React components. The root cause was that `CreateSlotModal` was rendered unconditionally in the parent tree and held internal state initialized via `useState(defaultTime || "09:00")`. Because React only evaluates state initializers on mount, subsequent prop changes were ignored.

We applied a two-fold solution:
1. Added a `useEffect` synchronization hook in `CreateSlotModal` to reset `startTime`, `date`, and `providerId` whenever the modal opens or its default props change.
2. In `page.tsx`, wrapped `CreateSlotModal` in conditional rendering with a dynamic key (`key={`${createSlotPrefill.providerId}_${createSlotPrefill.time}_${selectedDate}`}`). This forces a fresh mount with the exact clicked time tile instantly available on frame 1 without layout shifts.

---

## 6. Summary of AI Workflow

* **Where AI Accelerated Progress**: Boilerplate generation (Prisma schema layout, tRPC router setup, SVG icon imports, and TypeScript interfaces).
* **Where Developer Review Was Essential**: Medical domain logic, temporal date arithmetic (timezones and hours-until-appointment), relational immutability guarantees, and React lifecycle edge cases.
