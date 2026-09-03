# Assignment 06 — Clinic Appointment Scheduling

## The scenario

Picture a small multi-provider clinic — a physical therapy practice, a dental office — booking
patient appointments across several providers, currently coordinated by a front desk working from a
paper day-sheet and a shared calendar nobody outside the office can see.

The result is predictable. Two patients are told the same slot is open, and one of them shows up to
a double-booking that could have been caught in advance. A provider's Thursday afternoon quietly
empties out because three patients in a row never confirmed and never showed, and nobody flagged it
until it was too late to fill the time. Asking how full tomorrow is means someone physically
counting boxes on a printed sheet.

They want one system where front-desk staff manage availability and bookings, providers see their
own day and log what happened at each visit, and appointments that are drifting toward a no-show get
flagged before the slot is wasted. That is the system you are building.

## What it must do

Everything below is required. Several of the ten spell out exact rules — what happens on an illegal
move, what a bulk action must report back, when a dismissed alert is allowed to reappear — and those
specifics are the actual ask, not just the bold headline in front of them.

1. **Accounts and roles.** People sign in with an email and password, and there are at least two
roles — a front-desk role and a provider role. Front-desk staff can create availability slots for
any provider, confirm or cancel any appointment, and reassign appointments between providers.
Providers can only see and act on their own schedule, and cannot create slots for another provider
or reassign an appointment away from themselves. The difference must be enforced on the server, not
just hidden in the interface.

2. **Appointment slots.** Front-desk staff and providers create appointment slots with a provider, a
date, a start time and a duration, and can edit them while unbooked. Once a patient requests a slot,
that same record becomes an appointment, tracked through the states described below. Slots can be
archived and restored. Archiving removes a slot from the schedule without destroying the history of
one that has already become an appointment.

3. **Visit notes.** Every visit note belongs to exactly one appointment and records the provider's
observations from that visit as free text. Visit notes can be added and edited by the provider who
wrote them. Opening an appointment shows all of its visit notes in order.

4. **Appointment status.** An appointment moves *Requested → Confirmed → Checked In → Completed*. It
can be marked *No Show* only from Confirmed, and only after the slot's scheduled time has passed.
Cancellation is permitted only before check-in and must include a reason — once a patient has
checked in, the appointment can no longer be cancelled. Any other move must be rejected by the
server with a message explaining why.

5. **Care team.** An appointment has one scheduling provider, but any number of other providers can
be added to it as supporting providers, and a provider can be added this way to any number of
appointments. Every provider can see one list of every appointment where they are the scheduling
provider or added as a supporting provider.

6. **Finding appointments.** One list shows appointments with a text search over patient name,
filters for provider, status and date range, sorting by date and time, status or provider, and
pagination showing the total number of matches. All of this must happen on the server — do not load
every appointment into the browser and filter there.

7. **Bulk availability generation.** Front-desk staff can generate a recurring pattern of
availability slots for a provider across a date range in one action — the same weekly time blocks
repeated for two months, for example. The result must report which slots were created and which were
skipped because they collided with an existing booking. Separately, export a single day's schedule
as a CSV file.

8. **A dashboard.** A landing view shows headline numbers — appointments today, patients checked in
right now, no-shows this week, confirmed appointments upcoming. It also breaks appointments down by
provider and by status, and charts no-show rate per week over the last eight weeks.

9. **History you cannot rewrite.** Every appointment has a timeline showing every status change with
the old and new status and who made it, every supporting-provider assignment and unassignment, every
cancellation with its reason, and every visit note added, with its author and the time it was
written. Nothing in this timeline can be edited or deleted after the fact, including by front-desk
staff.

10. **Unconfirmed alerts.** Any appointment still in Requested status within 24 hours of its
scheduled time appears in an alerts area, with a count badge visible to front-desk staff. A
front-desk staff member can dismiss an alert. If the appointment is still unconfirmed an hour before
its scheduled time, the alert reappears regardless of the earlier dismissal.

## Stretch ideas (optional)

None of these are required, and none substitute for a goal above. If you finish all ten with time
left over, pick whichever of these sounds most useful and build it:

- Automated reminder messages before an appointment.
- Recurring appointments for ongoing treatment plans.
- A patient-facing self-service booking view.
- A waitlist for fully booked days.
- Per-visit-type default durations.
- Room or equipment assignment alongside provider.
- A printable day sheet for the front desk.
- Billing notes per visit.
- An email digest of tomorrow's unconfirmed appointments.


---

## What we are assessing

A working application is table stakes. Almost every serious candidate will produce something that runs, has a login, and roughly does what was asked. That's the floor, not the differentiator.

What actually separates submissions is the record of thinking behind the app: the decisions you made and why, the trade-offs you weighed, what you built first and what you deliberately left out, and whether you can explain any part of your own system when asked. We are hiring for judgement. The app is the evidence for that judgement, not the deliverable in itself.

We also read the code itself for structure and readability, which counts for a small share of the overall score.

## Time budget

Budget about 12 hours total, spent roughly 2 hours a day across a week.

This is not a race. We are not timing you against other candidates, and submitting early scores nothing extra. Twelve hours is a size guide so you know how much to attempt — pace yourself, stop when you're tired, and spend some of that time thinking and documenting, not only typing code.

## Pick any stack you like

Use any language, any framework, any UI library, any ORM, and any database access approach you want. We have no house stack, and no stack scores better than another — this round is not a test of whether you know particular tools.

Use whatever you are fastest and most confident in. Time spent learning something new to impress us is time not spent on the ten goals above, and it will show.

## Using AI is allowed and encouraged

Use AI tools however you want — to scaffold code, debug a stuck problem, write tests, draft documentation, or anything else that helps you move faster. A few things to know about how we treat it:

- We do not penalise AI use, and we make no attempt to detect it.
- We care about whether you understood, directed and verified the output — not about who or what produced the first draft of it.
- `docs/ai-prompts.md` must contain the prompts you actually used, including the ones that produced bad output and what you changed afterwards. If you used no AI at all, say so here and describe how you worked instead — that is assessed the same way.
- Submitting generated code you cannot explain is the single most common way candidates fail this round.

You are accountable for everything in your submission. If a reviewer points at a piece of code and asks why it's there, or why it works the way it does, "the AI wrote it" is not an answer.

## Use git properly

Publish to a public GitHub repository, and commit incrementally as the work actually happens — after each meaningful step, not in one pass at the end.

A repository whose entire history is a single "initial commit" containing a finished app scores zero on git history, and it colours how we read everything else in your submission, however good the app itself is. Your history is how we see the order you built in, where you got stuck, and how the design changed along the way. If it isn't there, we can't assess it, and we won't assume the best.

## What you must commit

Alongside your code, commit these five files under `docs/`. Your zip includes a stub for each with the questions it needs to answer — fill them in as you go, not from memory at the end.

| File | What it must answer |
|------|----------------------|
| `docs/architecture.md` | What the moving pieces are, how they talk to each other, where each one runs, the request path for one representative user action end to end, and what you decided not to build. |
| `docs/schema.md` | Every table's columns and types, which relationships are one-to-many versus many-to-many, which constraints live in the database versus the application, what you deliberately denormalised, and what would break first at 100x the data. |
| `docs/plan.md` | How you split the work into sessions, what order you built in and why, what you estimated versus what it actually took, and what you cut when you ran short. |
| `docs/decisions.md` | At least five real decisions — what you chose, what you rejected, and why — including at least one you later reversed. |
| `docs/ai-prompts.md` | The prompts you actually used, in order, grouped by what you were trying to do, including at least one that produced something wrong and what you did about it. |

## Host it for free

Deploy the whole thing somewhere reachable by URL, using free tiers only.

One combination that works, if you would rather not decide:

- **Database** — a managed service such as Supabase.
- **Server-side code** — Render.
- **Browser-side code** — Vercel.

Deploy in that order: create the database first, give the server its connection details as environment variables, then point the browser-side part at the server's public URL.

This is one option, not a requirement. Any free host is equally acceptable — everything on a single provider, one virtual machine, a container platform, a static host with serverless functions. The choice earns and loses nothing.

Requirements:

- A working live URL.
- Seeded with enough demo data to show the system doing something, not an empty shell.
- Demo credentials for every role recorded in `SUBMISSION.md`.
- Connection strings, keys and passwords kept in environment variables, never in the repository.
- Free tiers often sleep when idle and can take a minute or more to wake. Note it in `SUBMISSION.md` if yours does, so a slow first load is not read as a broken deployment.
- If you cannot get it hosted, submit anyway and record in `SUBMISSION.md` what you tried and where it broke.

## How to submit

Send us:

- The URL of your public GitHub repository.
- The URL of your live, deployed application.
- Your completed `SUBMISSION.md`, committed to the repository.

That's the whole submission. Nothing else to prepare, no separate form.

## What happens next

If your submission clears the bar, we'll set up a short call. We will ask about specific decisions we can see in your repository and its history — why you modelled something a particular way, what a certain commit was fixing, what you'd change if you kept going.

We're telling you this now because it should change how carefully you document as you go. Write `docs/decisions.md` for a version of yourself who has to explain it three weeks from now.

## Scope

The 10 goals stated in this brief are the cutoff. Meet all 10, solidly, and you have a complete submission.

Stretch ideas are optional. They exist for candidates who finish the 10 with time left and want to keep building — they are never required, and they do not make up for a goal you didn't hit. Doing 8 goals well beats doing 10 goals badly. If time is short, finish fewer goals properly rather than leaving all ten half-done.
#   C h r o n o s - C l i n i c  
 