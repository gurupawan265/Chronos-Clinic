# AI Prompts & Workflow Log

This document records the AI interaction log for building Chronos Clinic, detailing prompts used, output generated, and corrections made during implementation.

---

## 1. Project Initialization & Architecture Design

### Prompt
> "Set up Next.js 14 (App Router) + TypeScript + tRPC + Prisma + PostgreSQL + NextAuth (credentials). Schema:
> User (email, password hash, role: FRONT_DESK | PROVIDER)
> Slot (providerId, date, startTime, durationMinutes, status ARCHIVED|ACTIVE, timestamps) — becomes an Appointment once booked, same underlying record
> Appointment (extends/relates 1:1 to a booked Slot; patientName, patientContact, status REQUESTED|CONFIRMED|CHECKED_IN|COMPLETED|NO_SHOW|CANCELLED, cancellationReason nullable, timestamps)
> VisitNote (appointmentId, authorProviderId, content, createdAt, editable only by the authoring provider, no delete)
> StatusHistory (appointmentId, fromStatus, toStatus, changedByUserId, changedAt) — append-only
> SupportingProviderAssignment (many-to-many Provider↔Appointment, plus assignedAt/unassignedAt for history) — one scheduling provider lives on Appointment itself, supporting providers here
> AlertDismissal (appointmentId, dismissedAt, dismissedForScheduledAt) — tied to the appointment's scheduled time so it can be forced to reappear later regardless of dismissal
> Seed: 2 front-desk users, 4 providers, ~30 slots/appointments across statuses and dates, some Requested appointments within 24h of 'now' (for alert testing) and one within 1h of 'now' that's already been dismissed once (to test the 'reappears anyway' rule). Explain each modeling choice for schema.md............read the readme file and do this"

### What you got
An initial design proposal that outlined full-stack configuration, schema models, and a seed structure.

### What you corrected
The first draft of the alert check simply checked `if (appointment.alertDismissals.length > 0) return null;` without calculating whether `now >= (scheduledTime - 1h)`. This failed the assignment requirement where an alert dismissed earlier must reappear when within 1 hour of the appointment. We corrected the alert router query to compute the time delta:
```ts
const hoursUntilScheduled = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
const isWithinOneHour = hoursUntilScheduled <= 1;
if (matchingDismissal && !isWithinOneHour) {
  return null; // Suppressed during 24h - 1h window
}
// If within 1 hour, alert surfaces even if matchingDismissal exists!
```

---

## 2. Supporting Provider History Modeling

### Prompt
> "How should we model SupportingProviderAssignment to fulfill Goal 9: 'every supporting-provider assignment and unassignment... Nothing in this timeline can be edited or deleted after the fact'?"

### What you got
The initial suggestion suggested hard-deleting the join record on unassignment and appending an unassignment message string to `StatusHistory`.

### What you corrected
Hard-deleting join records loses structured relational auditability. We corrected the model to include `assignedAt` and nullable `unassignedAt` directly on `SupportingProviderAssignment`:
```prisma
model SupportingProviderAssignment {
  id            String    @id @default(cuid())
  appointmentId String
  providerId    String
  assignedAt    DateTime  @default(now())
  unassignedAt  DateTime? // Preserved for complete audit history
  appointment   Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  provider      User        @relation(fields: [providerId], references: [id], onDelete: Restrict)
}
```
When unassigning, the mutation updates `unassignedAt = new Date()` rather than issuing a `DELETE` query, guaranteeing full historical tracking.

---

## 3. Bulk Availability Generator Collision Reporting

### Prompt
> "Implement bulk availability generator for front desk: repeat weekly time blocks across a date range, reporting created slots vs skipped collisions."

### What you got
A generator that threw an error upon hitting the first duplicate slot.

### What you corrected
Goal 7 explicitly requires: *"The result must report which slots were created and which were skipped because they collided with an existing booking."* Throwing an error terminates the whole batch. We modified the procedure to check each slot individually, catching collisions and collecting them into a structured report `{ createdCount, skippedCount, created: [...], skipped: [{ date, startTime, reason }] }` so non-colliding slots in the date range are successfully generated.
