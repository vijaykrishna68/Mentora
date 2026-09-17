# Mentora — Phase 3A
# Booking Consistency & Scheduling Architecture

**Status:** Locked  
**Phase:** 3A — Booking Consistency & Scheduling  
**Database:** PostgreSQL  
**Purpose:** Define how Mentora generates availability and guarantees consistent appointment booking.

---

## 1. Overview

Mentora does not persist individual time slots.

Available slots are derived dynamically from:

- Mentor availability rules
- Selected offering
- Offering duration
- Offering availability categories
- Buffer duration
- Minimum booking notice
- Maximum advance booking window
- Existing appointments
- Mentor booking availability status

The frontend displays availability, but the **backend is the authoritative source of truth** when an appointment is created.

The system must guarantee that two customers cannot successfully book overlapping appointments with the same mentor.

---

# 2. Core Architectural Decisions

## 2.1 Slots are derived, not persisted

There is no `Slot` table or collection.

Slots are generated when a customer selects:

- Mentor
- Offering
- Date

Conceptually:

```text
Mentor Availability
        +
Selected Offering
        +
Requested Date
        +
Scheduling Constraints
        +
Existing Appointments
        ↓
Available Slots