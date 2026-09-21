> **Historical planning document.** Written before implementation and kept for context and design rationale. It is not kept in sync with the code: where it differs from the implementation, the code and the [README](README.md) are authoritative.



**`03c-backend-technical-spec.md`**


# Mentora — Phase 3C
# Backend Technical Specification

**Status:** Locked  
**Phase:** 3C — Backend Technical Specification  
**Language:** TypeScript  
**Runtime:** Node.js  
**Framework:** Express  
**Database:** PostgreSQL  
**ORM:** Prisma  
**Validation:** Zod  
**Authentication:** JWT + HTTP-only cookies  
**Testing:** Vitest + Supertest  
**Architecture:** Modular Monolith / REST API

---

# 1. Purpose

Phase 3C translates the decisions from:

- Product Definition
- Design Language
- Phase 3A — Booking Consistency & Scheduling
- Phase 3B — Data & API Architecture

into an implementation-level backend specification.

This document defines:

- Backend architecture
- Project structure
- Authentication
- Authorization
- Validation
- Prisma usage
- Scheduling services
- Booking transactions
- Error handling
- API structure
- Date/time handling
- Testing strategy
- Security fundamentals
- Development workflow

The purpose is to provide a clear implementation contract before backend development begins.

---

# 2. Backend Stack

The backend uses:

```text
Node.js
TypeScript
Express
Prisma
PostgreSQL
Zod
JWT
HTTP-only cookies
bcrypt
Temporal
Vitest
Supertest
````

The stack is intentionally minimal.

The project does not require:

```text
Redis
Kafka
GraphQL
Microservices
CQRS
Event sourcing
Message queues
Complex caching
Kubernetes
```

The backend is a modular monolith.

---

# 3. High-Level Architecture

```text
React + TypeScript
        ↓
REST API
        ↓
Express
        ↓
Middleware
        ↓
Controllers
        ↓
Domain Services
        ↓
Prisma
        ↓
PostgreSQL
```

Responsibilities:

```text
Frontend
  → UI state
  → Forms
  → User interactions
  → Timezone display

Backend
  → Authentication
  → Authorization
  → Validation
  → Business rules
  → Scheduling
  → Booking
  → Data transformation

PostgreSQL
  → Persistence
  → Relationships
  → Constraints
  → Data integrity
  → Appointment concurrency
```

---

# 4. Architectural Style

Mentora uses a **modular monolith**.

Each domain is separated into a module:

```text
auth
mentors
offerings
availability
appointments
reviews
```

Modules live inside the same backend application and database.

This gives the project domain separation without introducing the operational complexity of microservices.

---

# 5. Request Lifecycle

A typical request follows:

```text
HTTP Request
      ↓
CORS
      ↓
Authentication middleware
      ↓
Role / authorization middleware
      ↓
Request validation
      ↓
Controller
      ↓
Domain service
      ↓
Prisma
      ↓
PostgreSQL
      ↓
Service result
      ↓
Controller response
```

Errors flow through centralized error handling.

---

# 6. Project Structure

Recommended structure:

```text
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── src/
│   ├── config/
│   │   └── env.ts
│   │
│   ├── lib/
│   │   ├── prisma.ts
│   │   └── auth.ts
│   │
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── error.ts
│   │   └── validation.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schema.ts
│   │   │   └── auth.types.ts
│   │   │
│   │   ├── mentors/
│   │   ├── offerings/
│   │   ├── availability/
│   │   ├── appointments/
│   │   └── reviews/
│   │
│   ├── utils/
│   │
│   ├── app.ts
│   └── server.ts
│
├── tests/
│
├── .env
├── .env.example
├── package.json
└── tsconfig.json
```

Not every module is required to contain every file.

The structure should grow with actual complexity rather than creating empty abstractions.

---

# 7. Application Entry Points

## `server.ts`

Responsible for starting the HTTP server.

Conceptually:

```text
Load environment
      ↓
Initialize application
      ↓
Start server
```

---

## `app.ts`

Responsible for constructing the Express application.

Conceptually:

```text
Express
  ↓
Middleware
  ↓
Routes
  ↓
Error handler
```

Keeping `app.ts` separate from `server.ts` makes API testing easier because tests can import the application without starting a real HTTP server.

---

# 8. Environment Configuration

Required environment variables:

```text
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
CLIENT_URL
NODE_ENV
PORT
```

Development example:

```text
DATABASE_URL=...
JWT_SECRET=...
JWT_EXPIRES_IN=...
CLIENT_URL=http://localhost:5173
NODE_ENV=development
PORT=5000
```

Production values must be provided through the deployment environment.

Secrets must never be committed to Git.

---

# 9. Environment Validation

Environment configuration should be validated when the application starts.

If required configuration is missing:

```text
Application startup
        ↓
Environment validation fails
        ↓
Application exits
```

The backend should fail fast rather than running with incomplete configuration.

---

# 10. Prisma

Prisma is the application-level ORM.

It handles:

* Queries
* Inserts
* Updates
* Deletes
* Transactions
* Relations
* Type-safe database access

The Prisma schema represents the application's relational domain.

PostgreSQL-specific features that Prisma cannot fully represent should be introduced through migrations.

---

# 11. Prisma Client

Create a single Prisma client instance.

Conceptually:

```text
src/lib/prisma.ts
```

The application should not create a new Prisma client for every request.

All domain services use the shared Prisma client.

---

# 12. Database Models

The backend uses these core models:

```text
User
MentorProfile
ExperienceEntry
Offering
AvailabilityRule
Appointment
Review
```

There is no persistent `Slot` model.

---

# 13. Prisma Enums

The following domain enums should be represented explicitly:

```text
Role
AppointmentStatus
ConnectionMode
AvailabilityCategory
DayOfWeek
```

Example:

```text
Role:
  CUSTOMER
  MENTOR

AppointmentStatus:
  CONFIRMED
  CANCELLED
  COMPLETED

ConnectionMode:
  GOOGLE_MEET
  PHONE
```

Using enums prevents arbitrary values from entering the database.

---

# 14. Authentication Architecture

Authentication uses:

```text
JWT
+
HTTP-only cookie
```

The browser receives the JWT through an HTTP-only cookie.

JavaScript cannot directly access the cookie.

---

# 15. Registration Flow

```text
POST /auth/register
        ↓
Validate request
        ↓
Check email uniqueness
        ↓
Hash password
        ↓
Create user
        ↓
Create mentor profile if applicable
        ↓
Create authentication token
        ↓
Set HTTP-only cookie
        ↓
Return user information
```

The exact mentor onboarding/profile completion flow can occur after registration.

---

# 16. Login Flow

```text
POST /auth/login
        ↓
Validate request
        ↓
Find user
        ↓
Compare password with bcrypt
        ↓
Create JWT
        ↓
Set HTTP-only cookie
        ↓
Return authenticated user
```

Invalid credentials should not reveal whether the email or password was specifically incorrect.

---

# 17. JWT Payload

The JWT payload should remain minimal.

Conceptually:

```json
{
  "userId": "...",
  "role": "CUSTOMER"
}
```

Do not store the full user profile inside the token.

Avoid including:

```text
name
email
timezone
profile
offerings
permissions
```

The database remains the source of truth.

---

# 18. Authentication Middleware

Protected routes use:

```text
requireAuth
```

The middleware:

1. Reads the authentication cookie.
2. Verifies the JWT.
3. Extracts the user identity.
4. Attaches authenticated user information to the request.
5. Rejects invalid or missing authentication.

Conceptually:

```text
Request
   ↓
Cookie
   ↓
Verify JWT
   ↓
req.user
   ↓
Controller
```

---

# 19. Role Authorization

Role-specific routes use authorization middleware.

Conceptually:

```text
requireRole("MENTOR")
```

Example:

```text
POST /mentor/offerings
        ↓
requireAuth
        ↓
requireRole(MENTOR)
        ↓
controller
```

Customers must not be able to access mentor management routes.

---

# 20. Ownership Authorization

Role authorization alone is not enough.

A mentor route must also verify ownership.

Example:

```text
PATCH /mentor/offerings/:id
```

The backend must verify:

```text
Authenticated user
        ↓
MENTOR
        ↓
Offering belongs to this mentor
        ↓
Allow update
```

Likewise, customers may only access their own appointments.

---

# 21. Password Security

Passwords are hashed using bcrypt.

Never store plaintext passwords.

Registration:

```text
Plain password
      ↓
bcrypt
      ↓
passwordHash
      ↓
Database
```

Login:

```text
Password
   ↓
bcrypt.compare()
   ↓
Valid / Invalid
```

---

# 22. Validation

Zod is used for request validation.

Each relevant module may define schemas such as:

```text
auth.schema.ts
appointment.schema.ts
offering.schema.ts
availability.schema.ts
review.schema.ts
```

Zod validates request structure and basic constraints.

---

# 23. Structural vs Business Validation

These should remain separate.

### Structural validation

Handled by Zod:

```text
Is this field present?
Is this a valid UUID?
Is this a valid ISO timestamp?
Is rating between 1 and 5?
Is connectionMode valid?
```

### Business validation

Handled by services:

```text
Does the offering belong to this mentor?
Is the offering active?
Is the requested time available?
Does the time satisfy minimum notice?
Does the offering permit this category?
Can this appointment be cancelled?
Can this review be created?
```

---

# 24. Error Handling

Use centralized error handling.

Conceptually:

```text
Controller
    ↓
Service
    ↓
throw AppError
    ↓
Error middleware
    ↓
HTTP response
```

Domain errors should use predictable codes.

Example:

```text
SLOT_UNAVAILABLE
```

rather than exposing raw database errors.

---

# 25. Error Response

Standard error structure:

```json
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "That slot was just booked."
  }
}
```

Never expose:

```text
Stack traces
SQL queries
Database internals
Secrets
JWTs
```

in production responses.

---

# 26. HTTP Status Codes

Use:

```text
200 → Successful read/update
201 → Successful creation
400 → Invalid request
401 → Unauthenticated
403 → Not permitted
404 → Resource not found
409 → Data/scheduling conflict
500 → Unexpected server error
```

---

# 27. Scheduling Architecture

Availability is generated dynamically.

The backend should contain a dedicated availability service.

Conceptually:

```text
availability.service.ts
```

with a function similar to:

```text
getAvailableSlots(
  mentorId,
  offeringId,
  date
)
```

---

# 28. Slot Generator

The actual scheduling calculation should be isolated into deterministic logic.

Conceptually:

```text
slot-generator.ts
```

Input:

```text
Mentor timezone
Target date
Availability rules
Offering duration
Offering categories
Buffer
Existing appointments
Minimum notice
Maximum advance
```

Output:

```text
Available slots
```

This logic should be independently unit-testable.

---

# 29. Slot Generation Flow

```text
Request
   ↓
Load mentor
   ↓
Load offering
   ↓
Load relevant availability rules
   ↓
Load relevant appointments
   ↓
Generate candidate slots
   ↓
Apply scheduling constraints
   ↓
Remove conflicts
   ↓
Return slots
```

---

# 30. Timezone Handling

Scheduling must use timezone-aware operations.

The system must not manually calculate offsets using:

```text
UTC + 5.5
UTC - 4
```

or similar hardcoded arithmetic.

Mentor availability uses local time.

Appointments use UTC.

The scheduling layer performs the conversion.

---

# 31. Temporal

Use the Temporal API through:

```text
@js-temporal/polyfill
```

for timezone-aware scheduling calculations.

Temporal should be used where local dates, local times, timezone conversion, and recurring availability are involved.

---

# 32. Local Date vs Instant

The backend must distinguish between:

### Local date

```text
2026-09-18
```

Used for:

```text
Get availability for a specific date
```

### UTC instant

```text
2026-09-18T14:30:00Z
```

Used for:

```text
Appointment start/end
```

A local availability date must be interpreted in the mentor's timezone.

---

# 33. Availability API

```http
GET /api/mentors/:mentorId/availability
```

Parameters:

```text
offeringId
date
```

Example:

```text
GET /api/mentors/123/availability
    ?offeringId=456
    &date=2026-09-18
```

Response:

```json
{
  "data": {
    "date": "2026-09-18",
    "timezone": "Asia/Kolkata",
    "slots": [
      {
        "startAt": "2026-09-18T12:30:00Z",
        "endAt": "2026-09-18T13:15:00Z"
      }
    ]
  }
}
```

The frontend converts the timestamps for display.

---

# 34. Booking Architecture

The booking service is responsible for creating appointments.

Conceptually:

```text
appointment.service.ts
```

Function:

```text
createAppointment(customerId, input)
```

---

# 35. Booking Validation

The booking service performs:

```text
1. Authenticate customer

2. Load mentor

3. Load offering

4. Confirm offering belongs to mentor

5. Confirm offering is active

6. Read duration from offering

7. Calculate endAtUTC

8. Convert requested time to mentor timezone

9. Validate mentor availability

10. Validate availability category

11. Validate minimum notice

12. Validate maximum advance

13. Validate requested time is not in the past

14. Begin transaction

15. Create appointment

16. PostgreSQL validates overlap

17. Commit

18. Return appointment
```

---

# 36. Booking Request

The client sends:

```json
{
  "mentorId": "...",
  "offeringId": "...",
  "startAtUTC": "2026-09-18T12:30:00Z",
  "connectionMode": "GOOGLE_MEET"
}
```

The client does not send authoritative:

```text
duration
price
endAt
timezone
availability
```

These are derived by the backend.

---

# 37. Appointment End Time

The backend calculates:

```text
endAtUTC =
  startAtUTC +
  offering.durationMinutes
```

This prevents clients from manipulating appointment duration.

---

# 38. Booking Transaction

The database write occurs inside a transaction.

Conceptually:

```text
BEGIN TRANSACTION
        ↓
Create appointment
        ↓
PostgreSQL overlap constraint
        ↓
COMMIT
```

The transaction should remain small.

Do not place slow external operations inside the transaction.

---

# 39. Concurrency Protection

The database contains a PostgreSQL exclusion constraint preventing overlapping confirmed appointments for the same mentor.

Conceptually:

```sql
EXCLUDE USING gist (
  mentor_id WITH =,
  tstzrange(start_at, end_at, '[)') WITH &&
)
WHERE (status = 'CONFIRMED');
```

This ensures that simultaneous booking requests cannot both successfully create overlapping confirmed appointments.

---

# 40. Conflict Handling

If PostgreSQL rejects a booking because another appointment already occupies the requested interval:

```text
Database constraint error
        ↓
Service recognizes conflict
        ↓
SLOT_UNAVAILABLE
        ↓
HTTP 409
```

The raw PostgreSQL error is never returned to the client.

---

# 41. Conflict UX Contract

The frontend should receive:

```json
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "That slot was just booked."
  }
}
```

The frontend then:

1. Displays the conflict.
2. Refreshes availability.
3. Keeps the user on the mentor profile.
4. Preserves valid selections.
5. Allows the customer to select another slot.

The user should not be returned to Discover.

---

# 42. Appointment Snapshot

When creating an appointment, copy the relevant offering information:

```text
name
durationMinutes
price
currency
```

into:

```text
offeringSnapshot
```

The snapshot is stored as PostgreSQL `JSONB`.

This ensures that historical appointments remain accurate when offerings change.

---

# 43. Cancellation

Cancellation changes:

```text
CONFIRMED
    ↓
CANCELLED
```

The appointment is not deleted.

Cancelled appointments no longer block generated availability.

---

# 44. Cancellation Authorization

Before cancelling:

```text
Authenticated user
        ↓
Appointment exists?
        ↓
User owns appointment?
        ↓
Appointment can be cancelled?
        ↓
Change status
```

A customer cannot cancel another customer's appointment.

The exact cancellation time policy can be finalized during implementation if the product requirements require one.

---

# 45. Offering Deactivation

Offerings should use:

```text
isActive
```

rather than destructive deletion where historical appointments depend on them.

When inactive:

```text
Existing appointments → unaffected
New bookings → blocked
New slots → not generated
```

---

# 46. Mentor Availability Toggle

When:

```text
availabilityEnabled = false
```

new bookings are blocked.

Existing appointments remain unchanged.

When enabled again, valid future slots can be generated.

---

# 47. API Modules

Initial modules:

```text
auth
mentors
offerings
availability
appointments
reviews
```

Each module owns its routes, validation, and service logic.

---

# 48. Authentication Routes

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

---

# 49. Mentor Routes

Public:

```http
GET /api/mentors
GET /api/mentors/:mentorId
GET /api/mentors/:mentorId/availability
```

Authenticated mentor:

```http
GET   /api/mentor/profile
PATCH /api/mentor/profile

GET    /api/mentor/offerings
POST   /api/mentor/offerings
PATCH  /api/mentor/offerings/:id
DELETE /api/mentor/offerings/:id

GET    /api/mentor/availability
POST   /api/mentor/availability
PATCH  /api/mentor/availability/:id
DELETE /api/mentor/availability/:id

GET /api/mentor/appointments
```

---

# 50. Experience Routes

```http
POST   /api/mentor/experience
PATCH  /api/mentor/experience/:id
DELETE /api/mentor/experience/:id
```

Ownership must be verified.

---

# 51. Customer Appointment Routes

```http
GET   /api/appointments
POST  /api/appointments
PATCH /api/appointments/:appointmentId/cancel
```

---

# 52. Review Routes

```http
POST /api/appointments/:appointmentId/review
```

The backend verifies:

```text
Appointment belongs to customer
Appointment is COMPLETED
No existing review
Rating is valid
```

---

# 53. DTOs

API responses should not blindly expose Prisma models.

Instead, controllers/services should construct deliberate response objects.

This protects the API from accidentally exposing internal fields such as:

```text
passwordHash
internal database fields
private configuration
```

---

# 54. Appointment Response

Conceptually:

```json
{
  "data": {
    "id": "...",
    "mentor": {
      "id": "...",
      "name": "..."
    },
    "offering": {
      "name": "Career Deep Dive",
      "durationMinutes": 45,
      "price": 400,
      "currency": "INR"
    },
    "startAt": "2026-09-18T12:30:00Z",
    "endAt": "2026-09-18T13:15:00Z",
    "timezone": "Asia/Kolkata",
    "connectionMode": "GOOGLE_MEET",
    "status": "CONFIRMED"
  }
}
```

---

# 55. Pagination

Lists that may grow should support simple pagination:

```text
page
limit
```

Default:

```text
limit = 20
```

A reasonable maximum should be enforced.

Cursor pagination is unnecessary for v1.

---

# 56. Discover API

```http
GET /api/mentors
```

Potential filters:

```text
search
category
tags
price
sort
page
limit
```

The exact discover filtering behavior can be refined during frontend implementation.

---

# 57. Database Seed

A development seed should create realistic sample data.

At minimum:

```text
Multiple mentors
Multiple customers
Multiple offerings
Recurring availability
Existing appointments
Reviews
```

The seed should cover multiple scheduling states.

---

# 58. Seed Scenarios

Include examples such as:

```text
Mentor with morning availability
Mentor with evening availability
Mentor with multiple offerings
Mentor with multiple offering durations
Mentor with existing appointments
Mentor with no appointments
Mentor with no availability
Mentor with availability disabled
Mentor with reviews
```

This allows the frontend to be developed against meaningful data.

---

# 59. Testing Philosophy

Testing should focus on business-critical behavior.

The goal is not an arbitrary coverage percentage.

Priority:

```text
Scheduling correctness
Booking consistency
Authorization
Critical API behavior
```

---

# 60. Unit Tests

Unit-test the scheduling logic independently.

Test:

```text
Slot generation
Offering duration
Buffer calculation
Availability boundaries
Category filtering
Minimum notice
Maximum advance
Timezone conversion
Appointment conflict detection
```

Example:

```text
Availability:
18:00–21:00

Offering:
45 minutes

Buffer:
10 minutes

Expected:
18:00
18:55
19:50
```

---

# 61. Integration Tests

Database-backed tests should cover:

```text
Create appointment
Cancel appointment
Create review
Unique email
Unique mentor profile
One review per appointment
Foreign-key relationships
Appointment overlap constraint
```

---

# 62. Concurrency Test

This is one of the most important tests in the entire project.

Two booking requests should attempt to book the same slot.

Expected:

```text
Request A → 201
Request B → 409
```

Never:

```text
Request A → 201
Request B → 201
```

This demonstrates that the booking consistency architecture actually works.

---

# 63. API Tests

Use Supertest for HTTP-level tests.

Important routes:

```text
POST /api/auth/register
POST /api/auth/login
GET /api/mentors/:id
GET /api/mentors/:id/availability
POST /api/appointments
PATCH /api/appointments/:id/cancel
POST /api/appointments/:id/review
```

Test both successful and invalid requests.

---

# 64. Critical Test Matrix

| Scenario                                        | Expected             |
| ----------------------------------------------- | -------------------- |
| Valid booking                                   | `201`                |
| Same slot booked concurrently                   | One `201`, one `409` |
| Inactive offering                               | Rejected             |
| Outside availability                            | Rejected             |
| Past slot                                       | Rejected             |
| Minimum notice violation                        | Rejected             |
| Maximum advance violation                       | Rejected             |
| Invalid connection mode                         | Rejected             |
| Customer cancels own appointment                | Success              |
| Customer cancels another customer's appointment | `403`                |
| Cancelled slot becomes available                | Success              |
| Review before completion                        | Rejected             |
| Second review                                   | Rejected             |
| Mentor modifies another mentor's offering       | `403`                |

---

# 65. Security Fundamentals

The implementation must include:

```text
HTTP-only authentication cookie
Secure cookie in production
Appropriate SameSite configuration
Password hashing
CORS restriction
Request validation
Request body limits
Parameterized database access through Prisma
Centralized error handling
```

No sensitive credentials should appear in logs or API responses.

---

# 66. CORS

Only the configured frontend origin should be allowed.

Development:

```text
http://localhost:5173
```

Production:

```text
<deployed-frontend-domain>
```

Configured through:

```text
CLIENT_URL
```

---

# 67. Cookie Configuration

Production cookies should use:

```text
httpOnly: true
secure: true
```

and an appropriate `SameSite` configuration based on the final deployment topology.

Development may use a relaxed `secure` setting when running over localhost HTTP.

---

# 68. Logging

Log meaningful backend events such as:

```text
Authentication failure
Successful booking
Booking conflict
Unexpected server error
```

Do not log:

```text
Passwords
JWTs
Secrets
Sensitive credentials
```

Booking conflict logs may include:

```text
mentorId
customerId
requestedStart
```

but should avoid unnecessary sensitive data.

---

# 69. External Side Effects

External operations should not be performed inside the appointment transaction.

Avoid:

```text
BEGIN TRANSACTION
    ↓
Create appointment
    ↓
Call external service
    ↓
Send email
    ↓
COMMIT
```

Instead:

```text
Validate
    ↓
Transaction
    ↓
Persist appointment
    ↓
Commit
    ↓
External side effects
```

For v1, external side effects may be minimal.

---

# 70. Database Transaction Strategy

Use transactions when multiple operations must succeed or fail together.

Definitely use a transaction for:

```text
Appointment creation
```

Do not wrap every database query in a transaction unnecessarily.

---

# 71. Backend Development Order

Implementation should proceed in this order:

```text
1. Project initialization
2. TypeScript + Express setup
3. Environment configuration
4. Prisma + PostgreSQL
5. Database schema
6. Initial migration
7. PostgreSQL overlap constraint
8. Seed data
9. Authentication
10. Authorization middleware
11. Mentor/profile APIs
12. Offering APIs
13. Availability rules
14. Slot generation
15. Appointment booking
16. Cancellation
17. Reviews
18. API tests
19. Scheduling tests
20. Concurrency test
21. Error/state verification
```

This order minimizes dependencies and allows each major subsystem to be verified before moving forward.

---

# 72. Definition of Backend Complete

The backend should not be considered complete simply because the endpoints return data.

The following must work:

```text
Authentication
Authorization
Mentor profile
Offerings
Availability rules
Dynamic slot generation
Timezone conversion
Booking
Concurrency protection
Cancellation
Reviews
Validation
Error handling
Database constraints
Critical tests
```

Most importantly:

```text
Two customers cannot successfully book
the same overlapping mentor appointment.
```

---

# 73. Final Technical Architecture

```text
                         React
                           │
                           ↓
                       REST API
                           │
                        Express
                           │
              ┌────────────┴────────────┐
              ↓                         ↓
        Middleware                 Controllers
              │                         │
              └────────────┬────────────┘
                           ↓
                      Domain Services
                           │
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
   Availability       Appointments          Reviews
        │                  │
        └─────────┬────────┘
                  ↓
                Prisma
                  ↓
             PostgreSQL
                  │
          Database Constraints
                  │
                  ↓
          Data Integrity
```

---

# 74. Final Technical Decisions

| Area                    | Decision                        |
| ----------------------- | ------------------------------- |
| Language                | TypeScript                      |
| Runtime                 | Node.js                         |
| HTTP framework          | Express                         |
| Database                | PostgreSQL                      |
| ORM                     | Prisma                          |
| Validation              | Zod                             |
| Authentication          | JWT                             |
| Auth storage            | HTTP-only cookie                |
| Password hashing        | bcrypt                          |
| Date/time               | Temporal                        |
| Timezone format         | IANA                            |
| Stored appointment time | UTC                             |
| API style               | REST                            |
| API versioning          | No version prefix for v1        |
| Architecture            | Modular monolith                |
| Database concurrency    | PostgreSQL exclusion constraint |
| Unit testing            | Vitest                          |
| API testing             | Supertest                       |
| Caching                 | None initially                  |
| External services       | Minimal                         |
| Persistent slots        | No                              |
| Calendar integration    | No                              |
| Payments                | No                              |
| Rescheduling            | No                              |

---

# 75. Architecture Status

```text
01 — Product Definition
     LOCKED

02 — Design Language
     LOCKED

03A — Booking Consistency & Scheduling
     LOCKED

03B — Data & API Architecture
     LOCKED

03C — Backend Technical Specification
     LOCKED
```

The backend architecture is now defined.

The next stage is **implementation planning**, where these documents are turned into an executable specification for Claude Code.

````

### Where we are now

You now have a clean architecture chain:

```text
Product
   ↓
Design
   ↓
Scheduling rules
   ↓
Data/API architecture
   ↓
Backend implementation architecture
````

I would **not start coding yet**. The next document should be the implementation bridge that tells Claude *how to execute all of this without making architectural decisions on its own*.
