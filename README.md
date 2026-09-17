# Mentora

## Overview

Mentora is a mentor-booking platform: customers discover mentors, book time
with them around each mentor's real recurring availability, and manage their
appointments; mentors manage their public profile, offerings, and weekly
availability, and see the sessions booked with them. The backend is the
single source of truth for scheduling correctness — the frontend never
re-derives availability, overlap, or eligibility rules on its own.

## Core Features

- Customer discovery — search, category filter, and sort across mentors
- Public mentor profiles — bio, experience timeline, ratings, offerings
- Offerings — mentor-defined sessions (name, duration, price, connection
  modes, allowed time-of-day categories)
- Recurring weekly availability — mentor-configured rules with per-rule
  buffer, interpreted in the mentor's own IANA timezone
- Timezone-aware booking — slots are generated from the mentor's timezone
  and always converted to UTC for storage; both parties' local times are
  shown when they differ
- Appointments — upcoming/past views for both customers and mentors, with
  offering snapshots that stay historically accurate
- Cancellation — customer-initiated, subject to a 24-hour deadline enforced
  by the backend
- Reviews — left by a customer after a completed appointment, one per
  appointment
- Mentor management — setup/onboarding checklist, profile editing,
  experience entries, offering CRUD, availability CRUD, and an
  accepting-bookings toggle, all gated by backend-computed readiness

## Tech Stack

**Frontend**
- React, TypeScript, Vite
- React Router
- TanStack Query
- React Hook Form + Zod
- Tailwind CSS

**Backend**
- Node.js, TypeScript, Express
- PostgreSQL + Prisma
- JWT (HTTP-only cookies) + bcrypt
- Zod
- Temporal (`@js-temporal/polyfill`) for all timezone/date arithmetic

**Testing**
- Vitest
- React Testing Library
- Supertest

## Project Structure

```
backend/    Express API, Prisma schema + migrations, seed script, tests
frontend/   React app (Vite), organized by feature under src/features
design/     Visual design reference (editorial direction, screenshots)
```

## Prerequisites

- Node.js — no exact version is pinned in either `package.json` (`engines`
  is not set); a current LTS release is recommended.
- A running PostgreSQL server. The schema requires the `btree_gist`
  extension (used for the appointment overlap-prevention constraint); the
  first migration creates it automatically (`CREATE EXTENSION IF NOT EXISTS
  "btree_gist"`) if your database role has permission to do so.

## Environment Setup

Copy the example env files and adjust as needed:

```bash
cp backend/.env.example backend/.env
cp backend/.env.test.example backend/.env.test   # only needed to run backend tests
cp frontend/.env.example frontend/.env.development
```

Variables actually read by the application:

**backend/.env**
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NODE_ENV` | `development` / `test` / `production` |
| `PORT` | API server port (default `5000`) |
| `CLIENT_URL` | Frontend origin, used for CORS |
| `JWT_SECRET` | Signing secret for auth tokens — at least 32 characters |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime (e.g. `15m`) |

**frontend/.env.development**
| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL the frontend calls, e.g. `http://localhost:5000/api` |

No real secrets are included above or in the repo's `.env.example` files —
generate your own `JWT_SECRET` for any non-local use.

## Database Setup

```bash
createdb mentora_dev
cd backend
npx prisma migrate deploy
npx prisma db seed
```

(`npm run prisma:deploy` and `npm run prisma:seed` are equivalent package
scripts for the same two commands.)

## Running Locally

```bash
# backend (from backend/) — http://localhost:5000
npm install
npm run dev

# frontend (from frontend/, in a separate terminal) — http://localhost:5173
npm install
npm run dev
```

## Demo Accounts

All seeded accounts share one password: **`MentoraDemo123!`**

| Role | Email | Notes |
|---|---|---|
| **Customer** | `ananya.verma@mentora.dev` | Has one upcoming and one completed+reviewed appointment |
| **Customer** | `michael.chen@mentora.dev` | Has one upcoming and one completed, unreviewed appointment |
| **Customer** | `sara.ahmed@mentora.dev` | No interests selected; has one cancelled appointment |
| **Mentor** | `priya.sharma@mentora.dev` | Fully onboarded, accepting bookings |
| **Mentor** | `james.carter@mentora.dev` | Fully onboarded, accepting bookings |
| **Mentor** | `aiko.tanaka@mentora.dev` | Fully onboarded, **not** accepting bookings |
| **Mentor** | `diego.fernandez@mentora.dev` | Onboarded but has no availability rules or appointments |

## Testing

```bash
# backend (from backend/)
npm test          # 185 tests
npm run typecheck

# frontend (from frontend/)
npx vitest run     # 201 tests
npx tsc -b         # typecheck (also runs as part of `npm run build`)
npm run lint
npm run build
```

No coverage percentage is reported here because none is currently measured.

## Important Engineering Decisions

- **UTC storage**: every appointment's `startAt`/`endAt` is stored as a UTC
  instant; no wall-clock time is ever persisted directly.
- **Mentor timezone as source of truth**: a mentor's IANA timezone (not the
  viewing browser's) is authoritative for interpreting their availability
  and for what "mentor-local time" means on an appointment.
- **Temporal-based slot generation**: all scheduling arithmetic uses the
  `Temporal` API (`@js-temporal/polyfill`), never the server's local `Date`
  getters, so DST transitions and timezone conversions are handled
  correctly rather than by manual offset math.
- **Availability categories from local start time**: a slot's
  morning/afternoon/evening category is derived strictly from its
  mentor-local start time, never its end time or duration.
- **Buffer semantics**: buffer minutes belong to the availability rule, not
  the offering, and are only applied around an actual confirmed
  appointment — never reserved between purely hypothetical candidate slots.
- **Recurring weekly availability**: mentors configure availability as
  weekly recurring rules (day of week + time range + buffer); there are no
  one-off overrides or blackout dates.
- **Backend validation is authoritative**: the frontend performs
  UX-level validation only; every booking, cancellation, and profile/
  offering/availability mutation is re-validated and decided by the
  backend.
- **PostgreSQL exclusion constraint**: a `GIST` `EXCLUDE` constraint on
  confirmed appointments (per mentor, over their time range) is the final
  concurrency guard against double-booking, independent of any
  application-level check.
- **Cancellation rule**: a customer may cancel their own appointment up
  until 24 hours before its start; cancelling never affects other
  appointments and never resurfaces as a fabricated status.
- **Appointment snapshots**: each appointment stores a snapshot of the
  offering at booking time, so later offering edits or deactivation never
  rewrite historical appointment data.

## Scope

The following are intentionally out of scope for this version:

- Payments
- Recurring or repeating appointments
- Group sessions
- In-app messaging
- Calendar sync (Google Calendar, iCal, etc.)
- Google Meet link generation/integration (connection mode exists, but no
  meeting link is ever fabricated)
- Rescheduling an existing appointment (cancel + rebook only)

## Submission Verification

```bash
# 1. Database
createdb mentora_dev
cd backend && npx prisma migrate deploy && npx prisma db seed

# 2. Backend
npm test && npm run typecheck

# 3. Frontend
cd ../frontend
npx vitest run && npx tsc -b && npm run lint && npm run build

# 4. Manual check
# - start both dev servers (see "Running Locally")
# - log in as a seeded customer and a seeded mentor (see "Demo Accounts")
# - book a session as the customer, confirm it appears in "My appointments"
#   and on the mentor's dashboard
# - cancel the appointment
# - book and complete a session, then leave a review
```
