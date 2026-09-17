import { Prisma } from "@prisma/client";

// Two concurrent inserts racing for the same mentor/interval against the
// GiST exclusion constraint resolve one of two ways in PostgreSQL:
//
//   - 23P01 exclusion_violation — the common case: one insert commits, the
//     other's constraint check then fails cleanly.
//   - 40P01 deadlock_detected — under genuine concurrent load, both inserts
//     can end up waiting on each other's in-progress GiST index check
//     (circular wait), and Postgres kills one as a deadlock victim instead
//     of a clean constraint violation. This is documented PostgreSQL/GiST
//     behavior, independent of Prisma or of wrapping the insert in an
//     explicit transaction — confirmed here by reproducing it under a real
//     concurrent-request test against a real database (see appointment.test.ts).
//
// Both mean the same thing from the caller's perspective: this specific
// booking attempt lost the race and must be told SLOT_UNAVAILABLE, never a
// raw database error. Neither surfaces through a typed Prisma error code
// (Prisma has no specific mapping for EXCLUDE constraints or this deadlock
// shape), so both are detected by matching the stable Postgres SQLSTATE
// embedded in the PrismaClientUnknownRequestError message.
const CONFLICT_SQLSTATES = ["23P01", "40P01"];

export function isBookingConflictError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientUnknownRequestError && CONFLICT_SQLSTATES.some((code) => error.message.includes(code));
}
