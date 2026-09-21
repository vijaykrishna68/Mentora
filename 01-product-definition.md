> **Historical document — initial product definition (V0.1).** Written before implementation and kept for context only. It is not the current product specification: see the [README](README.md), which describes what was built. In particular, the "Fluid Neo-Brutalism" design direction mentioned here was replaced by the Modern Botanical / editorial direction (see [design/README.md](design/README.md)).

# Mentora — Product Definition

**Version:** V0.1
**Status:** Initial Product Definition
**Product Type:** Mentoring & Coaching Appointment Platform

---

## 1. Product Concept

Mentora is a lightweight mentoring and coaching platform that allows people to discover mentors, understand their expertise, and book 1:1 coaching sessions based on their availability.

The platform has two distinct user roles:

* **Customer** — discovers mentors and books sessions.
* **Mentor** — creates their profile, defines their offerings and availability, and manages appointments.

The product is intentionally small in scope, but should feel like a real product rather than an assignment or prototype.

The primary product goal is:

> **Help a customer find the right mentor and confidently book a suitable time with minimal friction.**

---

# 2. Target Users

## Customers

People looking for guidance, coaching, or mentoring in a particular area.

Examples:

* Career guidance
* Interview preparation
* Software engineering
* Leadership
* Entrepreneurship
* Personal development
* Other professional or skill-based categories

Customers should be able to discover mentors based on their interests, expertise, pricing, and availability.

---

## Mentors

Experienced professionals who offer 1:1 mentoring or coaching sessions.

Mentors control:

* Their profile
* Their expertise and categories
* Their session offerings
* Session duration
* Session pricing
* Availability
* Buffer time between sessions
* Connection modes
* Whether they are currently accepting bookings

---

# 3. Core Product Principles

### 3.1 Minimize friction

The customer should be able to go from discovering a mentor to booking a suitable slot with as few unnecessary decisions as possible.

### 3.2 Availability must be trustworthy

If a slot appears available, the customer should be able to trust that they can actually book it.

### 3.3 Never make users calculate timezones

Appointments are stored using UTC, while times are converted for display based on the relevant user's timezone.

Timezone information is surfaced primarily when the customer is selecting a slot, where it is most useful.

### 3.4 Keep complexity behind the interface

The underlying booking and availability system can be sophisticated, but the customer-facing experience should remain simple and unintimidating.

### 3.5 Quality over feature count

The MVP should have a small surface area with high attention to:

* UX
* Visual polish
* Responsiveness
* Feedback
* Reliability
* Accessibility
* Error handling

---

# 4. MVP Scope

## Customer

Customers can:

* Sign up and log in
* Select topics they are interested in during initial onboarding
* Discover mentors
* Search for mentors/services
* Filter and sort results
* View mentor profiles
* View mentor offerings
* View available appointment slots
* Select a slot
* Book a session
* Receive booking confirmation
* View upcoming appointments
* View past appointments
* Cancel appointments

---

## Mentor

Mentors can:

* Sign up and log in
* Complete their mentor profile during onboarding
* Create and manage a limited number of offerings
* Define session duration
* Define session price
* Define connection/platform modes
* Configure recurring availability
* Configure buffer duration
* Set their timezone
* Block specific dates/times when required
* Toggle whether they are accepting new bookings
* View upcoming appointments
* View past appointments
* Edit their profile and offerings

---

# 5. Customer Journey

```text
Login / Signup
      ↓
Initial Interests
      ↓
Discover
      ↓
Mentor Profile
      ↓
Select Offering
      ↓
Select Date & Slot
      ↓
Confirm Booking
      ↓
My Appointments
```

## Initial Interests

Only shown during initial signup.

Customers can select topics they are interested in, such as:

* Career Growth
* Interview Preparation
* Leadership
* Frontend
* Backend
* System Design
* Entrepreneurship

The step should be optional to skip.

The selected interests can later be used to make the discovery experience more relevant.

---

# 6. Customer Screens

## 6.1 Login / Signup

Authentication entry point.

The customer selects or is assigned the **Customer** role during account creation.

---

## 6.2 Discover

The primary discovery screen.

Customers should be able to:

* Search
* Filter by category/topic
* Filter by price
* Sort results
* Discover mentors
* See relevant availability information

### Mentor Card

A mentor card should communicate the most important information without requiring the user to open the profile.

Potential information:

* Mentor portrait
* Name
* Category
* Experience
* Rating
* Sessions completed
* Price
* Session duration
* Earliest available slots

Example:

```text
Career Guidance

John Doe
Senior Software Engineer · 8 yrs

★★★★★ 4.9
248 sessions completed

₹400 · 45 min

Next available
Tonight · 8:00 PM
Tomorrow · 10:00 AM

View slots →
```

The mentor's:

* Name
* Portrait
* Card

can be used to navigate to their full profile.

---

# 7. Mentor Profile

The mentor profile should establish enough credibility and context for a customer to make an informed booking decision.

## Profile contents

### Basic Information

* Portrait
* Name
* Country/location
* Country flag
* Primary category
* Relevant tags
* Experience

### About

A concise description of the mentor, their background, and what they help people with.

### Experience Timeline

A chronological timeline showing relevant professional experience.

Example:

```text
2024 — Present
Senior Engineer · Company X

2021 — 2024
Software Engineer · Company Y

2019 — 2021
Developer · Company Z
```

### Credibility

* Rating
* Number of completed sessions
* Experience

The preferred impact metric is **sessions completed** rather than an abstract "people impacted" metric.

Example:

```text
4.9
Average rating

248
Sessions completed

8 yrs
Experience
```

### Connection Modes

The mentor can specify supported ways to connect, such as:

* Google Meet
* Zoom
* Phone
* In-person

### Testimonials / Reviews

Customers can see reviews and testimonials from previous sessions.

### FAQ

Each mentor can provide answers to common questions about their sessions.

Potential questions:

* What can we discuss during this session?
* Who is this session suitable for?
* What is outside the scope of the session?
* What should I prepare beforehand?
* What happens after the session?

The FAQ exists to reduce uncertainty and establish expectations before booking.

---

# 8. Offerings

An **offering** describes what the customer is booking.

An offering is separate from an availability slot.

Example:

```text
Career Guidance
45 minutes
₹400
Google Meet
```

The mentor controls:

* Offering name
* Category
* Description
* Duration
* Price
* Connection mode

A mentor may have multiple offerings, subject to a fixed MVP limit.

---

# 9. Availability Model

Mentors should not manually create every individual appointment slot.

Instead, they define recurring availability rules.

Example:

```text
Monday – Friday
6:00 PM – 10:00 PM

Session duration: 45 minutes
Buffer: 15 minutes
Timezone: Asia/Kolkata
```

The system uses these rules to generate bookable slots.

---

## Availability vs Bookable Slots

These are separate concepts.

### Availability

Represents when the mentor is generally willing to accept sessions.

```text
Monday
6 PM – 10 PM
```

### Bookable Slot

Represents a specific occurrence that a customer can book.

```text
September 10
8:00 PM – 8:45 PM
```

Booking a slot should not modify the mentor's recurring availability.

It should only make that particular occurrence unavailable.

---

# 10. Session Duration & Buffer

Mentors define the duration of each offering and the buffer between sessions.

Example:

```text
Session duration: 45 min
Buffer: 15 min
```

The system therefore treats each session as consuming a 60-minute block of availability.

```text
6:00 – 6:45
Session

6:45 – 7:00
Buffer

7:00 – 7:45
Session
```

---

# 11. Timezone Handling

Timezone handling is an important part of the product because mentoring can happen across countries.

## Storage

Appointments should be stored using **UTC** as the canonical timestamp.

## Display

The frontend converts the timestamp into the relevant user's timezone.

The customer should primarily see timezone information when selecting a slot.

Example:

```text
8:30 PM · Your time
10:00 AM · Mentor's time
```

The customer's timezone should also be clearly identified.

Example:

```text
Your timezone
🇮🇳 IST · UTC+5:30
```

The mentor's timezone should similarly be represented where necessary.

---

## Country vs Timezone

Country and timezone are separate concepts.

The mentor's country/flag represents where they are based.

The timezone represents how appointment times should be interpreted.

The system should not assume that a country automatically determines a user's timezone.

---

# 12. Booking

The booking flow should be:

```text
Select Offering
      ↓
Select Date
      ↓
Select Available Slot
      ↓
Review Time + Timezone
      ↓
Confirm
      ↓
Booking Created
```

The selected appointment must be clearly communicated before confirmation.

After successful booking:

* Show a clear success state
* Add the appointment to the customer's appointments
* Send a confirmation email

---

# 13. Booking Reliability

Booking correctness is a core system requirement.

The system must prevent two customers from successfully booking the same slot.

Example:

```text
Customer A ──┐
             ├── Same slot
Customer B ──┘
             ↓
      Booking transaction
             ↓
     Only ONE succeeds
```

Concurrency must be handled at the backend/database level rather than relying solely on frontend availability checks.

### Core invariant

> **One bookable slot can have at most one confirmed appointment.**

---

# 14. Appointments

## Customer

The appointments area contains:

### Upcoming

Future confirmed appointments.

Each appointment should show:

* Mentor
* Offering
* Date
* Time
* Duration
* Connection mode
* Booking status

### Past

Previously completed or cancelled appointments.

Customers can cancel eligible upcoming appointments.

---

## Mentor

The mentor dashboard should provide a consolidated view of:

* Upcoming appointments
* Past appointments
* Who booked each offering
* Appointment time
* Offering
* Status

---

# 15. Mentor Dashboard

The mentor dashboard is the primary workspace after onboarding.

It should contain three core areas:

### Appointments

View upcoming and past bookings.

### Offerings

Create and manage offerings.

Example:

```text
Career Guidance
45 min · ₹400
Active

Interview Preparation
60 min · ₹600
Active
```

### Availability

View and edit recurring availability.

Example:

```text
Mon – Fri
6:00 PM – 10:00 PM

45 min sessions
15 min buffer

[ Edit availability ]
```

---

## Booking Availability Toggle

Mentors should have a simple global availability toggle.

Example:

```text
● Accepting bookings
```

or:

```text
○ Not accepting bookings
```

Turning this off should prevent new bookings without requiring the mentor to delete their availability configuration.

---

# 16. Primary Screen Architecture

## Customer

**1. Login**

Authentication and role selection.

**2. Discover**

Search, filtering, sorting, and mentor discovery.

**3. Mentor**

Full mentor profile, offerings, and embedded booking flow.

**4. Appointments**

Upcoming and past appointments.

The booking experience is treated as a flow within the mentor experience rather than an unnecessary standalone screen.

---

## Mentor

**1. Login**

Authentication and role selection.

**2. Dashboard**

The mentor's central workspace for:

* Appointments
* Offerings
* Availability
* Profile management

Profile setup is an onboarding flow rather than a permanent standalone screen.

---

# 17. System Requirements

The MVP should support:

* Role-based authentication
* Mentor profiles
* Customer interests
* Mentor offerings
* Recurring availability
* Session duration
* Buffer duration
* Bookable slot generation
* UTC appointment storage
* Frontend timezone conversion
* Booking
* Cancellation
* Email confirmation
* Concurrent booking protection
* Data validation
* Appropriate error handling
* Loading states
* Empty states
* Success states
* Responsive design

---

# 18. Explicitly Out of Scope for MVP

To keep the product focused, the following are intentionally excluded unless time permits:

* Payments
* In-app messaging
* Complex recommendation algorithms
* Social networking features
* Advanced analytics
* Complex mentor scheduling exceptions
* Multi-person/group sessions
* Subscription plans
* Automated dynamic pricing
* Google Calendar integration

Google Calendar integration may be considered as a later enhancement if the core product is complete.

---

# 19. Product Success

The primary measure of success is:

> **A customer can discover an appropriate mentor, understand what they offer, find a suitable time, and successfully book it with minimal friction.**

Supporting success criteria:

### Discovery

Customers can quickly find relevant mentors through search, filtering, sorting, and interests.

### Booking

Bookings should have a very low failure rate.

### Reliability

* No double bookings
* Accurate availability
* Consistent appointment state
* Correct cancellation behavior

### Clarity

Customers should always understand:

* Who they are booking
* What they are booking
* How long it lasts
* How much it costs
* When it will happen
* Which timezone the displayed time refers to
* How they will connect

### Trust

The product should feel reliable enough that a first-time user would be comfortable committing to a real mentoring session.

---

# 20. Design Direction — Pending

The visual design language has intentionally **not yet been defined**.

The current direction to explore is:

> **Fluid Neo-Brutalism + polished modern SaaS usability**

The design language will be defined separately after the product definition is locked.
