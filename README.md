# 🩺 Chronos Clinic — Multi-Provider Appointment Scheduling & Care Coordination OS

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3-blue?style=flat&logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![tRPC](https://img.shields.io/badge/tRPC-v10-2596be?style=flat&logo=trpc)](https://trpc.io/)
[![Prisma](https://img.shields.io/badge/Prisma-5.19-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![NextAuth.js](https://img.shields.io/badge/NextAuth-v4-purple?style=flat&logo=nextauth)](https://next-auth.js.org/)

An integrated, clinical-grade scheduling system engineered for multi-provider healthcare practices (physical therapy, sports medicine, rehabilitation, orthopedics). Chronos Clinic eliminates double-bookings with database-level isolation, prevents no-shows with proactive urgency-sorted alerting, strictly enforces medical state-machine transitions, and delivers an authentic high-density day-view time-grid.

---

## 🌟 Key Capabilities & User Experience

### 1. 📅 Day-View Schedule Grid (The Centerpiece)
- **Front-Desk "All Providers" Grid**: Side-by-side vertical columns for every clinic provider with an aligned 30-minute time gutter (08:00 to 18:00). Horizontal scrolling maintains sticky provider headers and sticky time labels.
- **Provider "My Schedule" View**: Dedicated single-column agenda timeline for individual clinicians, clearly differentiating appointments where they are the **Lead Scheduling Clinician** versus a **Supporting Care Team Member**.
- **Visually Distinct Slot States**:
  - **Booked Slots**: Solid clinical cards featuring a 4px left-border colored by status, patient name, contact info, duration, and direct status badges. Clicking any booked slot immediately opens the detail drawer.
  - **Available / Open Slots**: Visually distinct dashed borders (`border-2 border-dashed border-slate-700 bg-slate-900/25 hover:border-indigo-500`), green pulsing indicator, and a 1-click **"+ Book"** action.
  - **Archived Slots**: Muted, strikethrough styling with instant 1-click restoration.
  - **Empty Grid Cells**: Interactive hover action to instantly create a new availability slot at that exact provider and time.
- **Scheduling Controls**: Day navigation (`◀ Prev`, `Today`, `Next ▶`), interactive date picker, provider filter dropdown, real-time occupancy metric, and single-day **CSV Export**.

### 2. 🎨 Direct Color-Coded Status Badges
Status is rendered directly on every slot block, detail panel, and directory row with distinct, high-contrast tokens:
- 🟡 **Requested**: Amber border, amber background tint, pulsing amber dot.
- 🔵 **Confirmed**: Blue border, blue background tint, solid blue dot.
- 🟢 **Checked In**: Emerald border, emerald background tint, pulsing live-in-clinic dot.
- 🟣 **Completed**: Violet border, violet background tint, check indicator.
- 🔴 **No Show**: Rose/Red border, rose background tint, alert dot.
- ⚪ **Cancelled**: Neutral slate border, slate background tint, muted dot.

### 3. 📑 Slide-Over Appointment Detail Drawer
- **Non-Intrusive Workflow**: Slides in from the right edge (`fixed inset-y-0 right-0 max-w-xl`) over a semi-transparent backdrop so front-desk coordinators can act on bookings without losing the day-grid view underneath.
- **State Machine Action Toolbar**: One-click transition buttons enforced by server-side guards (e.g., No Show lockout before scheduled start time).
- **Care Team Management**: Primary scheduling clinician card + supporting clinician assignments with instant add/remove controls.
- **Visual Separation of Clinical Notes vs. Audit Timeline**:
  - **Clinical Documentation Tab**: Dedicated clinical view with physician badges, timestamps, formatted observations, and authoring textarea for licensed providers.
  - **Unified Audit Timeline Tab**: Authentic vertical event feed with a connected vertical track, event nodes, actor attribution, and permanent record timestamps.

### 4. ⚠️ Urgency-Sorted Dismissible Alerts Banner
- Flags unconfirmed (`REQUESTED`) appointments scheduled within 24 hours.
- **Urgency Sorting**: Strict order by closest scheduled start time first (`in 15 mins`, `in 2 hours`, `past due`).
- **Dismissal & Reappearance Engine**: Front desk can dismiss alerts to reduce noise. However, if the visit remains unconfirmed within **1 hour of start time**, the alert **automatically reappears** with an urgent glowing `REAPPEARED (<1h rule)` badge.

### 5. 📊 Dashboard Analytics & 8-Week No-Show Chart
- **Headline Stat Cards**: Appointments Today, Patients Checked In Right Now, No-Shows This Week, Confirmed Upcoming.
- **8-Week No-Show Trend Chart**: Visual weekly bar chart tracking unattended rates over time, with elevated rates (>20%) highlighted in rose.
- **Appointments Directory**: Search by patient name, multi-column sorting, provider/status/date filtering, and server-side offset pagination.
- **Bulk Availability Generator**: Automated recurring slot creator across date ranges and days of the week, reporting created slots vs. colliding skipped slots.

---

## 🔒 Clinical State Machine & Transition Rules

Chronos Clinic enforces a strict, server-side appointment state machine ([`appointmentStateMachine.ts`](file:///c:/Users/vijay/Desktop/ClickPlus/src/server/appointmentStateMachine.ts)):

```mermaid
stateDiagram-v2
    [*] --> REQUESTED: Patient books unreserved slot
    REQUESTED --> CONFIRMED: Front Desk confirms visit
    CONFIRMED --> CHECKED_IN: Patient arrives in clinic
    CHECKED_IN --> COMPLETED: Clinician finishes consultation
    
    CONFIRMED --> NO_SHOW: Patient fails to arrive (Unlocked only after scheduled start time)
    
    REQUESTED --> CANCELLED: Cancel with mandatory reason
    CONFIRMED --> CANCELLED: Cancel with mandatory reason
    
    CHECKED_IN --> CANCELLED: BLOCKED (Patient already in clinic)
    
    COMPLETED --> [*]
    NO_SHOW --> [*]
    CANCELLED --> [*]
```

### Safety Guards Enforced on the Server:
1. **Strict Forward Progression**: Progression occurs one step forward only (`REQUESTED` → `CONFIRMED` → `CHECKED_IN` → `COMPLETED`). Skipping steps (e.g. `REQUESTED` directly to `CHECKED_IN`) is rejected with `InvalidStatusTransitionError`.
2. **Early No-Show Lockout Guard**: An appointment can **only** be marked `NO_SHOW` from `CONFIRMED` **after** the slot's scheduled start time has passed. Premature marking is blocked with `EarlyNoShowError`.
3. **Mandatory Cancellation Reason**: Any cancellation requires a non-empty audit reason (`CancellationReasonRequiredError`).
4. **Cancellation Blocked Post-Check-In**: Once a patient has checked in to the clinic (`CHECKED_IN`), the appointment can no longer be cancelled (`CancellationBlockedError`).
5. **Terminal State Immutability**: `COMPLETED`, `NO_SHOW`, and `CANCELLED` are terminal states; no further transitions are permitted.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    Client["Next.js 14 Client Components (React 18 + Tailwind CSS)"]
    API["Next.js App Router API Routes (/api/trpc)"]
    Auth["NextAuth.js (JWT Session with Role-Based Guard)"]
    TRPC["tRPC v10 Router Procedures"]
    Guard["Server Middleware: frontDeskProcedure / protectedProcedure"]
    StateMachine["Clinical State Machine & Guard Validator"]
    Prisma["Prisma ORM Client"]
    DB[("PostgreSQL Database (Supabase IPv4 Pooler)")]

    Client -->|Type-safe RPC| API
    API --> TRPC
    TRPC --> Auth
    TRPC --> Guard
    Guard --> StateMachine
    StateMachine --> Prisma
    Prisma --> DB
```

---

## 👥 Demo Accounts & Credentials

All demo accounts share the password: `password123`

| Role | Name | Email | Password | Permissions & Notes |
|---|---|---|---|---|
| **Front Desk** | Alex Rivera | `alex.frontdesk@clinic.com` | `password123` | Full clinic coordination, multi-provider grid, slot creation for all doctors, reassignments, alert dismissals |
| **Front Desk** | Jordan Taylor | `jordan.frontdesk@clinic.com` | `password123` | Secondary front desk coordinator |
| **Provider** | Dr. Alex Smith | `dr.smith@clinic.com` | `password123` | Physical Therapy — My Schedule view, clinical visit note authoring |
| **Provider** | Dr. Jordan Jones | `dr.jones@clinic.com` | `password123` | Sports Medicine — My Schedule view, clinical visit note authoring |
| **Provider** | Dr. Priya Patel | `dr.patel@clinic.com` | `password123` | Rehabilitation Medicine |
| **Provider** | Dr. David Lee | `dr.lee@clinic.com` | `password123` | Orthopedic Surgery |

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- Node.js 18.17+ or Node.js 20+
- PostgreSQL database (local or cloud-hosted via Neon/Supabase)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/gurupawan265/Chronos-Clinic.git
cd Chronos-Clinic
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory (or copy from `.env.example`):
```env
DATABASE_URL="postgresql://username:password@localhost:5432/chronos_clinic?sslmode=prefer"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-random-jwt-key-here"
```

### 3. Database Migration & Seed
Run Prisma database sync and seed with realistic clinical demo data (providers, front desk staff, multi-day availability slots, appointments across all lifecycle states, clinical visit notes, and audit histories):
```bash
npx prisma db push
npm run prisma:seed
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Use any demo credential above to log in.

---

## 🧪 Automated Verification & Test Suite

Chronos Clinic includes an automated test runner verifying all 10 clinical transition rules, state progression limits, role guards, and error exceptions:

```bash
# Run the automated state machine test suite
npx tsx scripts/test-rules.ts
```

### Expected Output:
```text
==================================================
RUNNING AUTOMATED VERIFICATION FOR CLINIC RULES
==================================================
✔ [Pass] REQUESTED -> CONFIRMED
✔ [Pass] CONFIRMED -> CHECKED_IN
✔ [Pass] CHECKED_IN -> COMPLETED
✔ [Pass] REQUESTED -> CHECKED_IN blocked with InvalidStatusTransitionError
✔ [Pass] Early No-Show blocked with EarlyNoShowError
✔ [Pass] Past No-Show permitted from CONFIRMED
✔ [Pass] Empty reason cancellation blocked with CancellationReasonRequiredError
✔ [Pass] Cancellation before check-in with reason permitted
✔ [Pass] Cancellation after CHECKED_IN blocked with CancellationBlockedError
✔ [Pass] Transition from terminal state COMPLETED blocked
✔ [Pass] Transition from terminal state NO_SHOW blocked
✔ [Pass] Transition from terminal state CANCELLED blocked
==================================================
ALL CLINICAL TRANSITION RULES ARE 100% VERIFIED!
==================================================
```

### Type Safety Verification:
```bash
npx tsc --noEmit
```

---

## 📁 Repository Structure

```text
Chronos-Clinic/
├── docs/                           # Architecture, Schema & Design Decision docs
│   ├── architecture.md             # Moving parts, data flow, and trade-offs
│   ├── schema.md                   # Relational models, constraints, and indexes
│   ├── decisions.md                # 5 core architectural decisions weighed
│   ├── plan.md                     # Implementation milestones and pacing
│   └── ai-prompts.md               # Record of prompt iterations and refinements
├── prisma/
│   ├── schema.prisma               # Prisma relational schema with compound indexes
│   └── seed.ts                     # Comprehensive clinical seed script
├── scripts/
│   └── test-rules.ts               # Automated CLI verification suite for clinic rules
├── src/
│   ├── app/
│   │   ├── api/                    # NextAuth & tRPC HTTP handlers
│   │   ├── login/page.tsx          # Login page with one-click demo credentials
│   │   ├── layout.tsx              # Root layout with font imports & glow mesh
│   │   ├── page.tsx                # Main application page
│   │   └── globals.css             # Tailwind directives & clinical design tokens
│   ├── components/                 # Modular scheduling UI components
│   │   ├── DayScheduleGrid.tsx     # Centerpiece multi-provider time-grid
│   │   ├── AppointmentDetailDrawer.tsx # Slide-over side panel drawer
│   │   ├── StatusBadge.tsx         # Color-coded clinical status badges
│   │   ├── AlertsBanner.tsx        # Urgency-sorted dismissible alerts list
│   │   ├── StatCards.tsx           # Dashboard headline metric cards
│   │   ├── AnalyticsDashboard.tsx  # 8-week no-show trend chart & breakdowns
│   │   ├── AppointmentsDirectory.tsx # Searchable, sortable appointments table
│   │   ├── BulkAvailabilityGenerator.tsx # Recurring slot generation tool
│   │   ├── Modals.tsx              # Clean dialog modals (Book, Create, Cancel)
│   │   └── Navbar.tsx              # Top navigation bar & session profile
│   ├── server/
│   │   ├── appointmentStateMachine.ts # Strict state machine validator & error classes
│   │   ├── auth.ts                 # NextAuth credentials provider configuration
│   │   ├── db.ts                   # Prisma client singleton
│   │   └── trpc/                   # tRPC context, middleware & sub-routers
│   │       ├── routers/
│   │       │   ├── alert.ts        # Unconfirmed alerts query & dismissal engine
│   │       │   ├── appointment.ts  # Appointments query, mutations & state transitions
│   │       │   ├── dashboard.ts    # Real-time metrics & 8-week trend aggregations
│   │       │   ├── slot.ts         # Slot availability, bulk generator, day CSV export
│   │       │   └── visitNote.ts    # Clinical observations authoring
└── SUBMISSION.md                   # Candidate submission summary and reflections
```

---

## 📖 In-Depth Documentation

For thorough technical documentation, refer to the files in the `docs/` folder:
- **[Architecture Guide](file:///c:/Users/vijay/Desktop/ClickPlus/docs/architecture.md)** — Architectural patterns, request paths, and security boundaries.
- **[Database Schema Design](file:///c:/Users/vijay/Desktop/ClickPlus/docs/schema.md)** — Data dictionary, relational modeling, unique constraints, and scalability analysis.
- **[Architectural Decisions](file:///c:/Users/vijay/Desktop/ClickPlus/docs/decisions.md)** — Analysis of 5 architectural trade-offs and decisions.
- **[Development Plan](file:///c:/Users/vijay/Desktop/ClickPlus/docs/plan.md)** — Build milestones and timeline.
- **[Submission Summary](file:///c:/Users/vijay/Desktop/ClickPlus/SUBMISSION.md)** — Goal checklist and reviewer guide.

---

## 📄 License
This project is licensed under the MIT License.