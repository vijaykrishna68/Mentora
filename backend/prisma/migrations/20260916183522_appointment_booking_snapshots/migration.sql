-- Hand-written: mentorTimezone is required, but existing appointment rows
-- predate it. Add nullable, backfill from the mentor's current timezone,
-- then enforce NOT NULL.
ALTER TABLE "appointments" ADD COLUMN "mentorTimezone" TEXT;

UPDATE "appointments" a
SET "mentorTimezone" = mp."timezone"
FROM "mentor_profiles" mp
WHERE mp."id" = a."mentorProfileId";

ALTER TABLE "appointments" ALTER COLUMN "mentorTimezone" SET NOT NULL;

ALTER TABLE "appointments" ADD COLUMN "connectionDetail" TEXT;
