-- Prevents overlapping CONFIRMED appointment intervals for the same mentor.
-- Prisma cannot express PostgreSQL EXCLUDE constraints natively, so this is
-- hand-written raw SQL (see 03b-data-api-architecture.md §39).
--
-- Half-open interval [startAt, endAt): a session ending at 18:45 does not
-- conflict with one starting at 18:45.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlapping_confirmed"
  EXCLUDE USING gist (
    "mentorProfileId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("status" = 'CONFIRMED');

-- Basic interval sanity guards (defense-in-depth alongside application validation).
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_start_before_end"
  CHECK ("startAt" < "endAt");

ALTER TABLE "availability_rules"
  ADD CONSTRAINT "availability_rules_start_before_end"
  CHECK ("startTime" < "endTime");

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_range"
  CHECK ("rating" >= 1 AND "rating" <= 5);
