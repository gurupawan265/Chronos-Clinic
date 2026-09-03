# Schema & Data Modeling Architecture

This document details the complete data model for the Chronos Clinic scheduling platform, explaining every schema design choice, relational mapping, constraint boundary, deliberate denormalization, and scalability profile.

---

## 1. Table by Table: Columns and Types

### `User`
Stores staff credentials, profiles, and role assignments for authentication and authorization.
- `id` (`String` / CUID, Primary Key): Unique alphanumeric identifier.
- `email` (`String`, Unique): Case-insensitive user email for credentials login.
- `passwordHash` (`String`): Bcrypt salted password hash.
- `name` (`String`): Display name (e.g., "Dr. Sarah Smith (Physical Therapy)").
- `role` (`UserRole` Enum: `FRONT_DESK` | `PROVIDER`): Enforces role-based permissions across server procedures.
- `createdAt` (`DateTime`, default `now()`): Creation timestamp.
- `updatedAt` (`DateTime`, auto-update): Modification timestamp.

### `Slot`
Represents an available clinical time window on a provider's calendar. Unbooked slots represent open availability; when reserved, a slot links 1:1 to an `Appointment`.
- `id` (`String` / CUID, Primary Key): Unique slot identifier.
- `providerId` (`String`, Foreign Key -> `User.id`): The provider whose schedule holds this slot.
- `date` (`DateTime` / `@db.Date`): The calendar day of the slot.
- `startTime` (`String`, 24h format "HH:mm"): Starting time of the appointment window.
- `durationMinutes` (`Int`, default 30): Length of the slot in minutes.
- `status` (`SlotStatus` Enum: `ACTIVE` | `ARCHIVED`, default `ACTIVE`): Allows front-desk or providers to remove unneeded slots from circulation without destroying appointment history.
- `createdAt`, `updatedAt` (`DateTime`): Audit timestamps.

### `Appointment`
The operational record of a patient booking, linked 1:1 to its underlying `Slot`.
- `id` (`String` / CUID, Primary Key): Unique appointment identifier.
- `slotId` (`String`, Unique, Foreign Key -> `Slot.id`): 1:1 relation to the underlying slot record.
- `schedulingProviderId` (`String`, Foreign Key -> `User.id`): The primary physician or therapist responsible for the visit.
- `patientName` (`String`): Full name of the patient.
- `patientContact` (`String`): Phone number or email for patient communication.
- `status` (`AppointmentStatus` Enum: `REQUESTED` | `CONFIRMED` | `CHECKED_IN` | `COMPLETED` | `NO_SHOW` | `CANCELLED`): Current state within the clinical lifecycle.
- `cancellationReason` (`String?`, Nullable): Required explanation whenever an appointment is cancelled prior to check-in.
- `createdAt`, `updatedAt` (`DateTime`): Audit timestamps.

### `VisitNote`
Clinical observations recorded during or after the patient visit.
- `id` (`String` / CUID, Primary Key): Unique note identifier.
- `appointmentId` (`String`, Foreign Key -> `Appointment.id`): The visit this note belongs to.
- `authorProviderId` (`String`, Foreign Key -> `User.id`): The provider who wrote the note.
- `content` (`String` / `@db.Text`): Freeform clinical notes and treatment observations.
- `createdAt` (`DateTime`, default `now()`): Timestamp note was created.
- `updatedAt` (`DateTime`, auto-update): Timestamp note was last edited by its author.

### `StatusHistory`
An append-only audit ledger tracking every state transition throughout the appointment lifecycle.
- `id` (`String` / CUID, Primary Key): Unique ledger entry identifier.
- `appointmentId` (`String`, Foreign Key -> `Appointment.id`): Target appointment.
- `fromStatus` (`AppointmentStatus?`, Nullable): Preceding status (null for initial creation).
- `toStatus` (`AppointmentStatus`): Newly applied status.
- `changedByUserId` (`String`, Foreign Key -> `User.id`): User who initiated the status change.
- `reason` (`String?`, Nullable): Optional note or mandatory cancellation reason.
- `changedAt` (`DateTime`, default `now()`): Immutable timestamp of transition.

### `SupportingProviderAssignment`
Tracks care-team members assigned to collaborate on an appointment alongside the primary scheduling provider.
- `id` (`String` / CUID, Primary Key): Unique assignment record identifier.
- `appointmentId` (`String`, Foreign Key -> `Appointment.id`): Target appointment.
- `providerId` (`String`, Foreign Key -> `User.id`): Supporting provider assigned.
- `assignedAt` (`DateTime`, default `now()`): Timestamp provider joined care team.
- `unassignedAt` (`DateTime?`, Nullable): Timestamp provider was removed from care team (soft-unassignment to preserve audit history).

### `AlertDismissal`
Records dismissals of unconfirmed appointment alerts by front-desk staff.
- `id` (`String` / CUID, Primary Key): Unique dismissal identifier.
- `appointmentId` (`String`, Foreign Key -> `Appointment.id`): Target appointment.
- `dismissedAt` (`DateTime`, default `now()`): When dismissal occurred.
- `dismissedForScheduledAt` (`DateTime`): Exact scheduled appointment timestamp at the moment of dismissal.
- `dismissedByUserId` (`String?`, Nullable, Foreign Key -> `User.id`): Staff member who dismissed the alert.

---

## 2. Relationships: One-to-Many vs. Many-to-Many

### One-to-Many (1:N)
- `User` (1) ↔ `Slot` (N): A provider owns multiple availability slots over time.
- `User` (1) ↔ `Appointment` (N): A primary scheduling provider oversees many booked appointments.
- `User` (1) ↔ `VisitNote` (N): A provider can author multiple clinical visit notes across appointments.
- `User` (1) ↔ `StatusHistory` (N): A staff member or provider triggers multiple status transitions.
- `Appointment` (1) ↔ `VisitNote` (N): A single patient visit can contain notes from multiple attending care-team members.
- `Appointment` (1) ↔ `StatusHistory` (N): An appointment accumulates an append-only timeline of state transitions.
- `Appointment` (1) ↔ `AlertDismissal` (N): An appointment can have dismissal records across its lifespan.

### One-to-One (1:1)
- `Slot` (1) ↔ `Appointment` (1): The prompt specifies that an availability slot becomes an appointment once booked ("same underlying record / relates 1:1 to a booked Slot"). This is enforced by a `@unique` constraint on `Appointment.slotId`. An unbooked slot has no appointment (`appointment Appointment?`), while an appointment always belongs to exactly one slot.

### Many-to-Many (N:M)
- `Provider (User)` (N) ↔ `Appointment` (M): While every appointment has one primary scheduling provider, multidisciplinary care requires multiple supporting providers to participate. This is modeled via the `SupportingProviderAssignment` join entity, enriched with `assignedAt` and `unassignedAt` timestamps so the timeline preserves all past and present assignments.

---

## 3. Database vs. Application Constraints: Why We Drew the Line

A core tenet of robust clinical software is knowing which guarantees must live in the database engine and which belong in business domain logic:

| Constraint | Enforcement Level | Rationale |
|---|---|---|
| **No Double-Booking Collisions** | Database (`@@unique([providerId, date, startTime])`) | Prevents race conditions. If two front-desk workers attempt to book the same provider at 10:00 AM concurrently, the database guarantees atomic rejection. |
| **User Email Uniqueness** | Database (`@unique`) | Guarantees account uniqueness and prevents duplicate authentication identities. |
| **Referential Integrity** | Database (Foreign Keys + `ON DELETE`) | Prevents orphaned records (e.g. status history without an appointment). Restricts deletion of providers who have historical records. |
| **Valid Enum States** | Database (PostgreSQL `ENUM`) | Guarantees only recognized role and status values enter storage. |
| **Lifecycle State Machine** | Application (tRPC router) | Strict progression (*Requested -> Confirmed -> Checked In -> Completed*). Contextual validation (e.g., No Show only after scheduled time; Cancellation only before check-in) requires dynamic temporal evaluation against current system time (`now()`) and contextual validation messages. |
| **Role-Based Permissions** | Application (tRPC middleware) | Providers can only view and act on their own schedules; Front-Desk can reassign between providers. This logic depends on authenticated session claims (`ctx.session.user.role`). |
| **Visit Note Immutability & Author Locking** | Application (tRPC mutation) | Only the provider who originally authored a note can edit its contents. Deletion is completely blocked by omitting a `delete` mutation from the API surface. |
| **Alert 1-Hour Reappearance Rule** | Application (Alert Router) | Alerts dismissed earlier must reappear within 1 hour of the appointment. This requires a dynamic delta computation (`scheduledTime - now <= 1 hour`), which is evaluated at query time. |

---

## 4. Deliberate Denormalization

### 1. `Appointment.schedulingProviderId` alongside `Slot.providerId`
- **Why**: An appointment's slot already points to a `providerId`. However, denormalizing `schedulingProviderId` directly onto `Appointment` allows direct indexing and instant queries for provider rosters and dashboard metrics without performing an expensive SQL `JOIN` across the `Slot` table on every single request.
- **Maintenance**: When front-desk staff reassign an appointment to another provider, a database transaction updates both `Appointment.schedulingProviderId` and `Slot.providerId` atomically.

### 2. `AlertDismissal.dismissedForScheduledAt`
- **Why**: Rather than relying on a live join back to `Slot.date` and `Slot.startTime` (which can change if an appointment is rescheduled), snapshotting `dismissedForScheduledAt` ensures that if an appointment is rescheduled to a new time, any prior dismissal automatically invalidates itself and forces the alert to surface for the new time block.

---

## 5. What Would Break First at 100x Data (and How to Fix It)

At 100x scale (~500,000 slots, 300,000 appointments, and 2,000,000 history entries):

### 1. 8-Week Dashboard Analytics Aggregations
- **Break Point**: Computing weekly no-show rates across the previous 8 weeks by scanning hundreds of thousands of appointment records will cause slow queries and high database CPU usage.
- **Fix**: Introduce a daily roll-up table (`DailyClinicMetrics`) or PostgreSQL Materialized View refreshed periodically via a cron job, pre-calculating completed and no-show totals per provider.

### 2. Active Unconfirmed Alert Scanning
- **Break Point**: Querying `status = "REQUESTED"` with client/app-level date arithmetic across hundreds of thousands of rows.
- **Fix**: Create a composite index `@@index([status, createdAt])` and a PostgreSQL partial index:
  ```sql
  CREATE INDEX idx_active_requested_alerts ON "Appointment" ("schedulingProviderId") WHERE "status" = 'REQUESTED';
  ```
  This reduces the search space exclusively to open requests.

### 3. Offset Pagination (`skip` / `take`)
- **Break Point**: Using `skip: (page - 1) * pageSize` forces PostgreSQL to scan and discard thousands of rows when navigating to deep pages in large appointment directories.
- **Fix**: Switch from offset-based pagination to keyset (cursor-based) pagination using `(slot.date, appointment.id)` as the cursor.
