# Mentora

Mentora is a mentor-booking platform. Customers discover mentors, book 1:1 sessions
around each mentor's real recurring availability, and manage their appointments;
mentors run their public profile, offerings, weekly availability and the sessions
booked with them. The backend is the single source of truth for scheduling
correctness — the frontend never re-derives availability, overlap or eligibility
rules on its own.

## Live Demo

**https://mentora-two-ruddy.vercel.app**

The frontend is hosted on Vercel, the API on Render, and the database on Render
PostgreSQL (see [Production Deployment](#production-deployment)).

## Demo Access

You do not need to create an account. On the login page, choose **Try the demo**,
then pick a role:

- **Explore as a Customer** — signs in as the seeded customer *Ananya Verma* and lands on `/discover`.
- **Explore as a Mentor** — signs in as the seeded mentor *Priya Sharma* and lands on `/mentor`.

"Try the demo" is not a special code path. It calls the normal `POST /api/auth/login`
endpoint with a seeded account and goes through the same session handling as the
regular sign-in form. The demo accounts are **shared**, so changes one visitor makes
(bookings, cancellations, profile edits) can be seen by other visitors; a small notice
says so after you enter.

### Fallback credentials

All seeded accounts share one password: **`MentoraDemo123!`** (public demo data
created by `backend/prisma/seed.ts`; it is not a secret).

| Role | Email | Notes |
|---|---|---|
| Customer | `ananya.verma@mentora.dev` | One upcoming and one completed, reviewed appointment |
| Customer | `michael.chen@mentora.dev` | One upcoming and one completed, unreviewed appointment |
| Customer | `sara.ahmed@mentora.dev` | No interests selected; one cancelled appointment |
| Mentor | `priya.sharma@mentora.dev` | Fully onboarded, accepting bookings |
| Mentor | `james.carter@mentora.dev` | Fully onboarded, accepting bookings |
| Mentor | `aiko.tanaka@mentora.dev` | Onboarded but **not** accepting bookings (hidden from Discover) |
| Mentor | `diego.fernandez@mentora.dev` | Has an offering but no availability rules (hidden from Discover) |
| Mentor | `sofia.almeida@mentora.dev` · `arjun.nair@mentora.dev` · `nadia.haddad@mentora.dev` · `david.okafor@mentora.dev` · `camila.reyes@mentora.dev` | Fully bookable, with session history and reviews |
| Mentor | `amara.nwosu@mentora.dev` | Fully bookable, newly joined (no sessions or reviews yet) |

The seed also creates four reviewer customers (`rohan.iyer`, `emily.foster`,
`kwame.boateng`, `lucia.herrera` at `@mentora.dev`) that own the session history of
the additional mentors, so the original three customers' data stays as listed above.

## Product Overview

There are two roles, chosen at signup.

**Customer**
- Discover mentors with search, category filter and sorting
- View a mentor's public profile (bio, experience timeline, rating, completed sessions, offerings)
- Select an offering, a date, a connection mode and an available slot
- Review the booking, then confirm it
- See upcoming and past appointments
- Cancel an upcoming appointment (up to 24 hours before it starts)
- Review a completed appointment (1–5 stars, optional comment; one review per appointment)

**Mentor**
- Complete onboarding with a readiness checklist
- Edit their profile (headline, bio, country, timezone, phone, tags, connection modes, portrait URL, booking constraints)
- Manage their experience timeline
- Manage offerings (name, category, description, duration, price, currency, connection modes, allowed time-of-day categories)
- Manage recurring weekly availability (day, time window, buffer)
- Turn *accepting bookings* on or off
- See a dashboard and their upcoming and past appointments

A mentor only appears in Discover, and can only be booked, when they have a headline,
a bio, a timezone, at least one active offering, at least one active availability
rule, and have accepting bookings switched on. That check lives in one place on the
backend (`backend/src/modules/mentor/mentor.readiness.ts`).

Frontend routes: `/login`, `/signup`, `/discover`, `/mentors/:mentorId`, `/appointments`
(customer) and `/mentor`, `/mentor/setup`, `/mentor/offerings`, `/mentor/availability`,
`/mentor/appointments`, `/mentor/profile` (mentor). `/` redirects by role. Discover is
behind customer sign-in in the UI, even though `GET /api/mentors` itself is public.

## UX / Product Decisions

- **Two distinct roles.** Customers and mentors get separate shells, navigation and route guards; visiting the other role's route redirects to your own home.
- **Fixed duration and price per offering.** A session's length and price come from the offering, never from the customer, so a booking cannot be shortened or repriced.
- **Recurring weekly availability.** Mentors describe a normal week once; bookable slots are generated from it.
- **Mentor timezone is the source of truth.** Availability is interpreted in the mentor's own timezone; customers see slots in their browser's timezone, and the booking review shows the mentor's local time as well when the two differ.
- **Review before confirming.** Booking is a modal that goes review → processing → confirmed. If someone else takes the slot first, the modal closes, the slot list refreshes and a toast explains what happened.
- **Cancellation policy.** A customer can cancel until 24 hours before start; the backend enforces it and the UI shows whatever the backend says.
- **Reviews only after the fact.** Only completed, non-cancelled appointments can be reviewed, once each.
- **Feedback states.** Pages have loading skeletons, empty states, error states with retry, and success/failure toasts.
- **Responsive.** Layouts adapt from phone widths up; dialogs use an accessible focus-trapping modal.

## Tech Stack

**Backend** (`backend/`)
- Node.js (≥ 24) and TypeScript, Express 5
- PostgreSQL with Prisma 6
- Zod 4 for request validation
- JWT (`jsonwebtoken`) in HTTP-only cookies, `bcrypt` password hashing, `cookie-parser`, `cors`
- `@js-temporal/polyfill` for all timezone and date arithmetic
- Vitest and Supertest for tests, `tsx` for development and seeding

**Frontend** (`frontend/`)
- React 19 and TypeScript, built with Vite
- React Router 7
- TanStack Query 5 for server state
- Zustand (used only for the toast store)
- React Hook Form with Zod resolvers
- Tailwind CSS 4, self-hosted Ibarra Real Nova and Public Sans (`@fontsource`)
- Vitest, Testing Library and jsdom for tests; Oxlint for linting

## Architecture

A modular monolith: one Express API, one PostgreSQL database, one React SPA.

```
React SPA (Vercel)
   │  fetch, credentials: "include"      (HTTP-only cookies, JSON { data } / { error })
   ▼
Express API (Render)
   routes → validation (Zod) → auth / role middleware → controllers → services
   │
   ▼
Prisma ──► PostgreSQL (Render)
```

- **Backend modules** (`backend/src/modules/`): `auth`, `mentor` (self-management), `mentors` (public discovery, profile, availability), `appointments` (booking, cancellation, reviews) and `scheduling` (pure slot-generation logic). Controllers stay thin; services own the rules.
- **Authentication** issues a short-lived access token and a rotating refresh token, both as HTTP-only cookies. `requireAuth` verifies the access token; `requireRole` restricts routes to `CUSTOMER` or `MENTOR`.
- **Scheduling** is a pure module (`slot-generator.ts`) with no database access and an injected clock. Slot listing and booking validation share it, so there is one implementation of the rules.
- **Booking** revalidates the requested slot server-side and relies on a PostgreSQL exclusion constraint as the final guard against double-booking.
- **Reviews** are attached to appointments; a mentor's rating and completed-session count are derived from them at read time.
- **Frontend server state** is handled by TanStack Query. A single API client unwraps the response envelope and, on a 401, performs one deduplicated silent refresh and retries the request. The current user comes from `GET /api/auth/me` via one `useSession` hook — the frontend never sees or decodes a token. Route guards (`GuestOnly`, `RequireAuth`, `RequireRole`) read that session.

## Data Model

Defined in `backend/prisma/schema.prisma` (UUID primary keys, table names plural snake_case).

| Entity | Purpose |
|---|---|
| `User` | Email, password hash, role (`CUSTOMER` / `MENTOR`), name, and (for customers) topic interests |
| `MentorProfile` | One per mentor user: headline, bio, country, IANA timezone, phone, tags, connection modes, avatar URL, FAQ, `acceptingBookings`, `onboardingComplete`, `minimumNoticeMinutes` (default 60), `maximumAdvanceDays` (default 30) |
| `ExperienceEntry` | A mentor's timeline entries, ordered |
| `Offering` | A bookable session type: category, duration, price, currency, connection modes, allowed availability categories, `isActive` |
| `AvailabilityRule` | Recurring weekly window: day of week, local start/end time, buffer minutes, `isActive` |
| `Appointment` | Customer + mentor + offering, UTC `startAt`/`endAt`, status, connection mode, and booking-time snapshots |
| `Review` | One per appointment (unique), rating 1–5, optional comment |
| `RefreshToken` | Hashed refresh tokens with expiry and revocation time |

Key points:
- `User` → `MentorProfile` is one-to-one and only for mentors; a mentor profile owns its experience, offerings, availability rules, appointments and reviews.
- `Appointment` stores **snapshots** — `offeringSnapshot` (name, duration, price, currency), `mentorTimezone` and `connectionDetail` — so later edits to an offering, timezone or phone number never rewrite history.
- Only `CONFIRMED` and `CANCELLED` are persisted. **Completed** is derived at read time (`CONFIRMED` with `endAt` in the past) and never written.
- Appointments reference customers, mentors and offerings with `ON DELETE RESTRICT`, so history cannot be silently removed.
- Time-of-day category (morning / afternoon / evening) is not stored on availability rules; it is derived from a slot's local start time.
- Database `CHECK` constraints enforce `startAt < endAt` on appointments, `startTime < endTime` on rules, and `rating` between 1 and 5.

## Scheduling & Booking Reliability

- **Slots are generated dynamically.** There is no slot table. For a mentor, offering and date the API builds candidate slots from that weekday's active rules, stepping by the offering's duration, then filters them.
- **The mentor's timezone is the source of truth.** A rule's `startTime`/`endTime` are wall-clock times in the mentor's IANA timezone, converted with Temporal so daylight-saving changes are handled correctly.
- **Appointments are persisted in UTC.** `startAt` and `endAt` are UTC instants; the mentor's timezone at booking time is stored alongside them.
- **Availability categories come from local start time.** Morning is 06:00–12:00, afternoon 12:00–17:00, evening 17:00–23:00, judged only by the slot's start (a 11:30 start is morning even if it runs past noon). A slot is offered only if its category is one the offering allows.
- **Buffers apply around confirmed appointments.** Candidate slots are not padded with buffers; once an appointment is confirmed, its interval is widened by the rule's buffer on both sides before checking candidates for overlap.
- **Other filters.** Slots must respect the mentor's minimum notice and maximum advance window, cannot be in the past, and are not offered while the mentor is not accepting bookings.
- **Adjacent slots stay valid.** Overlap is checked on half-open intervals, so a session ending at 18:45 does not conflict with one starting at 18:45.
- **The backend revalidates every booking.** `POST /api/appointments` checks the mentor, offering, connection mode and requested time against the same slot pipeline used for listing. The end time, price, currency and timezone are always derived on the server; unknown request fields are rejected.
- **A database exclusion constraint prevents overlaps.** `appointments_no_overlapping_confirmed` is a GiST `EXCLUDE` constraint on `mentorProfileId` and `tstzrange("startAt", "endAt", '[)')`, restricted to `CONFIRMED` rows. It is hand-written SQL in a migration (Prisma cannot express it) and requires the `btree_gist` extension.
- **Concurrent conflicts return 409.** When two requests race for the same slot, one succeeds and the other receives `409 SLOT_UNAVAILABLE`, whether PostgreSQL reports it as an exclusion violation or as a deadlock between the two inserts. A test with two simultaneous requests against real PostgreSQL covers this.
- **Cancelled appointments do not block availability.** The constraint and the slot generator only consider `CONFIRMED` appointments, so a cancelled slot can be booked again.

## Authentication & Security

- **Access token**: a JWT containing only `userId` and `role`, signed with `JWT_SECRET`, 15 minutes by default, set in an HTTP-only cookie with `path=/`.
- **Refresh token**: an opaque random value (not a JWT), 7 days, set in an HTTP-only cookie scoped to `path=/api/auth` so it is not sent on ordinary API calls.
- **Refresh token storage**: only a SHA-256 hash is stored, so a database leak does not expose usable tokens.
- **Rotation and revocation**: each refresh token is single-use; refreshing revokes it and issues a new one. If an already-revoked token is presented again, all of that user's active refresh tokens are revoked. Logout revokes the presented token and clears both cookies.
- **Passwords** are hashed with bcrypt (cost 12). Login returns the same generic error for an unknown email and a wrong password, and compares against a dummy hash for unknown emails so response timing does not reveal which accounts exist.
- **Role-based access**: `requireRole` guards the mentor-only (`/api/mentor/*`) and customer-only (`/api/appointments`) routers.
- **Ownership checks**: services verify the authenticated user owns the appointment being cancelled or reviewed (403 otherwise), and a mentor can only touch their own offerings, rules and experience.
- **Validation**: request bodies, params and queries are validated with Zod; write schemas are `.strict()` so clients cannot set server-owned fields such as `onboardingComplete`, price or end time. JSON bodies are limited to 10 KB.
- **CORS**: a single allowed origin (`CLIENT_URL`) with credentials enabled.
- **Production cookies**: `Secure` and `SameSite=None` so the cookies work between the separately hosted frontend and API. In development and test they use `SameSite=Lax` without `Secure`. No cookie `domain` is set.
- **Secrets** come from environment variables only; the repository contains `.env.example` files and no real secrets.

## API Overview

All routes are under `/api`. Success responses are `{ "data": ... }`; failures are
`{ "error": { "code", "message" } }`.

**Auth**

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create a customer or mentor account |
| POST | `/auth/login` | Sign in (sets cookies) |
| POST | `/auth/logout` | Revoke the refresh token and clear cookies |
| POST | `/auth/refresh` | Rotate the refresh token and issue a new access token |
| GET | `/auth/me` | Current user (requires auth) |

**Public mentors** (no auth)

| Method | Path | Purpose |
|---|---|---|
| GET | `/mentors` | Discover bookable mentors — query: `category`, `q`, `sort` (`newest` / `rating` / `sessions`), `page`, `limit` |
| GET | `/mentors/:mentorId` | Public profile, offerings, rating and session stats |
| GET | `/mentors/:mentorId/availability` | Bookable slots — query: `offeringId`, `date` (`YYYY-MM-DD`) |

**Customer appointments** (role: customer)

| Method | Path | Purpose |
|---|---|---|
| GET | `/appointments` | My appointments, split into upcoming and past |
| POST | `/appointments` | Book a slot (`mentorId`, `offeringId`, `startAt`, `connectionMode`) |
| PATCH | `/appointments/:id/cancel` | Cancel (until 24 hours before start) |
| POST | `/appointments/:id/review` | Review a completed appointment (`rating`, optional `comment`) |

**Mentor management** (role: mentor)

| Method | Path | Purpose |
|---|---|---|
| GET, PATCH | `/mentor/profile` | Read or update profile, booking constraints and *accepting bookings* |
| POST | `/mentor/experience` | Add an experience entry |
| PATCH, DELETE | `/mentor/experience/:id` | Edit or remove an entry |
| GET, POST | `/mentor/offerings` | List or create offerings |
| PATCH, DELETE | `/mentor/offerings/:id` | Edit or remove an offering |
| GET, POST | `/mentor/availability` | List or create weekly availability rules |
| PATCH, DELETE | `/mentor/availability/:id` | Edit or remove a rule |
| GET | `/mentor/appointments` | Sessions booked with me, upcoming and past |

## Testing

Both suites were run for this documentation:

| Suite | Result |
|---|---|
| Backend (Vitest + Supertest, real PostgreSQL) | **185 tests** in 8 files, all passing |
| Frontend (Vitest + Testing Library, jsdom) | **212 tests** in 35 files, all passing |

**Backend** tests run against a dedicated PostgreSQL test database (`.env.test`), with
all tables truncated before each test and test files run serially. They cover
registration, login, refresh rotation and logout; role and ownership checks; profile,
experience, offering, availability and onboarding-readiness rules; Discover filtering,
sorting, pagination and privacy of the public profile; slot generation (windows,
buffers, time-of-day categories, timezones, minimum notice, maximum advance); booking
validation; the concurrent-booking race; cancellation and its 24-hour deadline;
customer and mentor appointment lists; and reviews.

**Frontend** tests mock the network layer and cover the API client (including the
refresh-and-retry behavior), route guards and session, the login page (including the
demo flow), Discover, the mentor profile, the full booking flow, appointments
(cancel and review dialogs), the mentor dashboard, profile setup and settings,
offerings, availability, UI primitives and date/time utilities.

There are no browser end-to-end tests, and no coverage percentage is measured.

```bash
# backend/
npm test
npm run typecheck

# frontend/
npx vitest run
npx tsc -b        # typecheck (also runs as part of `npm run build`)
npm run lint
npm run build
```

## Local Development

This is a two-package repository (`backend/` and `frontend/`), each with its own
`package.json` and lockfile.

**Prerequisites**: Node.js 24 or newer, and a PostgreSQL server where your role can run
`CREATE EXTENSION btree_gist` (the first migration does this).

**1. Database**

```bash
createdb mentora_dev
```

**2. Backend** (`http://localhost:5000`)

```bash
cd backend
cp .env.example .env        # then set DATABASE_URL and a real JWT_SECRET
npm install
npm run prisma:deploy       # apply migrations
npm run prisma:seed         # load demo data (see warning below)
npm run dev
```

**3. Frontend** (`http://localhost:5173`, in a second terminal)

```bash
cd frontend
cp .env.example .env.development
npm install
npm run dev
```

**Backend environment variables** (`backend/.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NODE_ENV` | `development`, `test` or `production` (default `development`) |
| `PORT` | API port (default `5000`) |
| `CLIENT_URL` | Frontend origin, used for CORS |
| `JWT_SECRET` | Signing secret, at least 32 characters |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime (default `15m`) |

**Frontend environment variables** (`frontend/.env.development`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | API base URL, e.g. `http://localhost:5000/api` |

**Running the backend tests** needs a separate database:

```bash
createdb mentora_test
cd backend
cp .env.test.example .env.test                      # adjust DATABASE_URL if needed
DATABASE_URL="postgresql://<user>:<pass>@localhost:5432/mentora_test?schema=public" npx prisma migrate deploy
npm test
```

> **The seed is destructive.** `npm run prisma:seed` deletes every row in the users,
> appointments, reviews, offerings and related tables before inserting demo data. Only run it
> against a local or demo database.

The backend also has `npm run build` (`prisma generate && tsc -p tsconfig.build.json`,
compiling only `src/` into `dist/`) and `npm start` (`node dist/src/server.js`).

## Production Deployment

| Piece | Host |
|---|---|
| Frontend | Vercel |
| Backend API | Render (web service) |
| Database | Render PostgreSQL |

**Backend (Render, root directory `backend`)**
- Build: `npm ci --include=dev && npm run build`. The build needs devDependencies (TypeScript, the Prisma CLI and `@types/*` packages); if `NODE_ENV=production` is set, npm skips them unless `--include=dev` is passed.
- Start: `npm start`
- Migrations: run `npm run prisma:deploy` against the production database (`prisma migrate deploy`; never `migrate dev`).
- Seed: run `npm run prisma:seed` once against the demo database to load demo data. It wipes existing rows, so do not re-run it once real data exists.
- Environment variables (set in Render; values are not stored in the repository): `DATABASE_URL`, `NODE_ENV=production`, `JWT_SECRET`, `CLIENT_URL` (the exact frontend origin, no trailing slash), optional `JWT_ACCESS_EXPIRES_IN`. `PORT` is provided by Render and read by the server.
- The server and the frontend must both be served over HTTPS, because production cookies are `Secure; SameSite=None`.

**Frontend (Vercel, root directory `frontend`)**
- Build: `npm run build`; output directory: `dist`.
- Environment variable: `VITE_API_URL`, the API base URL ending in `/api`. It is embedded at build time and falls back to `http://localhost:5000/api` if unset.
- `frontend/vercel.json` rewrites every path to `index.html`, so direct navigation and refreshes on client-side routes such as `/discover` or `/mentors/:mentorId` work.
- Mentor portraits are static files in `frontend/public/mentors/`, served from the frontend's own origin.

**Database**: PostgreSQL with the `btree_gist` extension (created by the first migration).

**Portraits and the seed.** `avatarUrl` is validated as an absolute URL, so the seed stores
full URLs for the two mentors that have portraits (`/mentors/priya-sharma.jpg`,
`/mentors/james-carter.jpg`), built from `PORTRAIT_BASE_URL` in `backend/prisma/seed.ts`.
If the production frontend domain changes, update that constant and re-seed. The other
mentors have no portrait and render an initials avatar.

## Project Structure

```
backend/
  prisma/
    schema.prisma            data model
    migrations/              SQL migrations, incl. the exclusion constraint
    seed.ts                  demo data
  src/
    app.ts, server.ts        Express app and entry point
    config/env.ts            validated environment
    lib/                     cookies, tokens, errors, prisma client
    middleware/              auth/role, validation, error handling
    modules/
      auth/                  register, login, refresh, logout, me
      mentor/                mentor self-management + readiness rules
      mentors/               public discovery, profile, availability
      appointments/          booking, cancellation, reviews
      scheduling/            slot generation (pure), time conversion
  tests/                     Vitest + Supertest
  tsconfig.json              dev/test config (includes tests)
  tsconfig.build.json        production build (src only)

frontend/
  public/mentors/            mentor portraits
  vercel.json                SPA rewrite
  src/
    app/                     providers, router, route guards, paths
    components/ui/           design-system primitives (Button, Dialog, Toast, ...)
    components/layout/       customer and mentor shells
    features/                auth, discover, mentor-profile, booking, appointments,
                             mentor-dashboard, mentor-profile-management,
                             offerings, availability
    lib/api/                 API client, error type, query keys
    lib/stores/              toast store
    styles/                  design tokens (Tailwind theme)
    types/                   API response types

design/                      design references (see design/README.md)
```

## Engineering Decisions / Tradeoffs

- **PostgreSQL over a document database.** Booking correctness depends on relational integrity and on a database-level exclusion constraint, which PostgreSQL provides directly.
- **Slots are derived, not persisted.** With no slot table there is nothing to keep in sync when a mentor edits availability, and one code path produces both the slot list and booking validation. The cost is recomputing slots per request, which is small at this scale.
- **Overlap protection in the database.** Application checks give friendly errors, but the exclusion constraint is what guarantees two customers cannot hold overlapping confirmed sessions, even under concurrent requests.
- **UTC storage, mentor timezone as the source of truth.** Instants are stored in UTC; wall-clock availability is interpreted in the mentor's timezone with Temporal, never with server-local `Date` arithmetic.
- **Snapshots on appointments.** Offering details, mentor timezone and connection detail are copied at booking time so history stays accurate after edits.
- **Derived completed status.** No background job flips appointments to completed; it is computed from `endAt`.
- **Modular monolith.** One deployable API with clear module boundaries; splitting into services would add operational cost without a scaling need.
- **HTTP-only cookies for auth.** Tokens are not reachable from JavaScript. The trade-off is the `SameSite=None; Secure` requirement when the frontend and API are on different sites.
- **Backend-authoritative rules.** The frontend does UX-level validation only; every booking, cancellation and mentor mutation is decided by the backend.
- **Discover sorting in memory.** Filtering happens in SQL and rating/session sorting over the filtered set happens in application code — simple and adequate for a small directory, but it would need revisiting for a large one.
- **Deliberately small scope.** No payments, messaging or calendar integration in this version.

## Scope / Deliberate Non-Goals

The scope was kept small on purpose so the core booking flow could be built carefully.
The following are not implemented:

- Payments, subscriptions and dynamic pricing (prices are display and snapshot data only)
- Recurring or repeating appointments, and group sessions
- Rescheduling (cancel and rebook instead)
- In-app messaging
- Video infrastructure — Google Meet is a connection *mode*, but no meeting link is generated
- Calendar sync (Google Calendar, iCal)
- One-off availability overrides, blackout dates and holiday exceptions
- Email or SMS notifications, email verification and password reset
- Image upload (portraits are URLs)
- Rate limiting and CSRF tokens
- Admin tooling and mentor approval

## Documentation

`README.md` is the authoritative description of the current product. The other Markdown
files at the repository root are **historical planning documents** written before
implementation (each carries a banner saying so); where they differ from the code or this
README, the code and this README are correct.

| File | Status |
|---|---|
| `01-product-definition.md` | Historical — initial product definition |
| `02-design-language.md` | Historical — the earlier neo-brutalist design brief, superseded |
| `03a-booking-consistency.md`, `03b-data-api-architecture.md`, `03c-backend-technical-spec.md` | Historical — pre-implementation backend design |
| `BACKEND-COMPLETE.md` | Historical — backend checkpoint note |
| `assignment.txt` | The original assignment brief |
| `design/README.md` | Which design references are current vs. superseded |

The implemented visual direction is "Modern Botanical": a warm ivory foundation, deep pine,
one restrained terracotta accent, Ibarra Real Nova with Public Sans. Its tokens live in
`frontend/src/styles/tokens.css`.
