import { describe, expect, it } from "vitest";
import { formatDate, formatFullDate, formatTime, timezonesDiffer, toDateKey } from "./datetime";

describe("timezone-aware formatting", () => {
  // Ground truth taken directly from the backend's own DST test
  // (backend/tests/slot-generator.test.ts, "16. handles a DST transition
  // correctly ... America/New_York, spring-forward 2026-03-08"): 18:00 EDT
  // on 2026-03-09 is 22:00 UTC — not 23:00, which a fixed-offset (EST)
  // implementation would produce. The frontend never computes this itself;
  // this test only verifies Intl represents the backend's own UTC instant
  // correctly, in whichever timezone is requested.
  it("represents a UTC instant correctly across a DST boundary (America/New_York, spring-forward 2026)", () => {
    const utcInstant = "2026-03-09T22:00:00.000Z";
    expect(formatTime(utcInstant, "America/New_York")).toBe("6:00 PM");
  });

  it("represents the same instant differently for mentor vs customer when their timezones differ", () => {
    // Matches backend/tests/slot-generator.test.ts test 14/15: 18:00 IST == 12:30 UTC.
    const utcInstant = "2026-01-05T12:30:00.000Z";
    expect(formatTime(utcInstant, "Asia/Kolkata")).toBe("6:00 PM");
    expect(formatTime(utcInstant, "America/New_York")).toBe("7:30 AM");
    expect(timezonesDiffer(utcInstant, "Asia/Kolkata", "America/New_York")).toBe(true);
    expect(timezonesDiffer(utcInstant, "Asia/Kolkata", "Asia/Kolkata")).toBe(false);
  });

  it("treats a legacy IANA alias as the same timezone, not a different one", () => {
    // "Asia/Calcutta" is a legacy alias for "Asia/Kolkata" — the exact
    // mismatch a browser's Intl.resolvedOptions().timeZone can produce
    // against a mentor profile's stored zone name. They must never be
    // reported as "different timezones" just because the id strings differ.
    const utcInstant = "2026-01-05T12:30:00.000Z";
    expect(timezonesDiffer(utcInstant, "Asia/Calcutta", "Asia/Kolkata")).toBe(false);
  });

  it("shows a different calendar date in the customer's timezone than in UTC when the instant crosses midnight", () => {
    // 22:00 UTC on 2026-03-09 is 03:30 the *next* calendar day in IST (UTC+5:30).
    const utcInstant = "2026-03-09T22:00:00.000Z";
    expect(formatDate(utcInstant, "UTC")).toContain("Mar 9");
    expect(formatDate(utcInstant, "Asia/Kolkata")).toContain("Mar 10");
    expect(formatTime(utcInstant, "Asia/Kolkata")).toBe("3:30 AM");
  });

  it("shows an earlier calendar date west of UTC than the UTC date itself", () => {
    // 02:00 UTC on 2026-06-15 is still 2026-06-14 in America/Los_Angeles (UTC-7 in June, PDT).
    const utcInstant = "2026-06-15T02:00:00.000Z";
    expect(formatDate(utcInstant, "UTC")).toContain("Jun 15");
    expect(formatDate(utcInstant, "America/Los_Angeles")).toContain("Jun 14");
  });

  it("formats a full review-modal date consistently with the day-of-week Intl derives for that timezone", () => {
    // 2026-03-09 is a Monday.
    expect(formatFullDate("2026-03-09T22:00:00.000Z", "America/New_York")).toBe("Monday, March 9, 2026");
    // The same instant, in IST, has already rolled into Tuesday.
    expect(formatFullDate("2026-03-09T22:00:00.000Z", "Asia/Kolkata")).toBe("Tuesday, March 10, 2026");
  });

  it("derives a YYYY-MM-DD date key from the given timezone, not the host's local timezone", () => {
    const date = new Date("2026-03-09T22:00:00.000Z");
    expect(toDateKey(date, "UTC")).toBe("2026-03-09");
    expect(toDateKey(date, "Asia/Kolkata")).toBe("2026-03-10");
    expect(toDateKey(date, "America/Los_Angeles")).toBe("2026-03-09");
  });
});
