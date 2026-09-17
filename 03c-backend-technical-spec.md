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