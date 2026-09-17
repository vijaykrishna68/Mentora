import { describe, it, expect } from "vitest";
import { Temporal } from "@js-temporal/polyfill";
import { generateSlots, deriveAvailabilityCategory, type GenerateSlotsInput } from "../src/modules/scheduling/slot-generator.js";

function t(time: string): Temporal.PlainTime {
  return Temporal.PlainTime.from(time);
}

function instant(iso: string): Temporal.Instant {
  return Temporal.Instant.from(iso);
}

// Sensible defaults for tests that don't care about notice/advance/appointments.
const BASE: Omit<GenerateSlotsInput, "localDate" | "timezone" | "availabilityRules" | "offering"> = {
  existingAppointments: [],
  now: instant("2020-01-01T00:00:00Z"), // far in the past relative to all test dates below
  minimumNoticeMinutes: 0,
  maximumAdvanceDays: 3650,
};

// 2026-01-05 is a Monday.
const MONDAY = Temporal.PlainDate.from("2026-01-05");

function offering(availabilityCategories: Array<"MORNING" | "AFTERNOON" | "EVENING">, durationMinutes = 45) {
  return { durationMinutes, availabilityCategories };
}

function rule(startTime: string, endTime: string, bufferMinutes = 0) {
  return { startTime: t(startTime), endTime: t(endTime), bufferMinutes };
}

describe("generateSlots — basic window generation", () => {
  it("1. generates candidates for a basic single availability window", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("09:00", "12:00")],
      offering: offering(["MORNING"], 45),
    });
    expect(slots.map((s) => s.startAt.toString())).toEqual([
      "2026-01-05T09:00:00Z",
      "2026-01-05T09:45:00Z",
      "2026-01-05T10:30:00Z",
      "2026-01-05T11:15:00Z",
    ]);
  });

  it("2. offering duration fits exactly inside the window", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("09:00", "09:45")],
      offering: offering(["MORNING"], 45),
    });
    expect(slots).toHaveLength(1);
    expect(slots[0]!.startAt.toString()).toBe("2026-01-05T09:00:00Z");
    expect(slots[0]!.endAt.toString()).toBe("2026-01-05T09:45:00Z");
  });

  it("3. rejects a candidate that would exceed the availability window", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("09:00", "10:00")],
      offering: offering(["MORNING"], 45),
    });
    // 09:00-09:45 fits; the next candidate 09:45-10:30 would exceed 10:00.
    expect(slots).toHaveLength(1);
    expect(slots[0]!.startAt.toString()).toBe("2026-01-05T09:00:00Z");
  });

  it("4. generates multiple back-to-back candidate slots", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("09:00", "11:00")],
      offering: offering(["MORNING"], 30),
    });
    expect(slots.map((s) => s.startAt.toString())).toEqual([
      "2026-01-05T09:00:00Z",
      "2026-01-05T09:30:00Z",
      "2026-01-05T10:00:00Z",
      "2026-01-05T10:30:00Z",
    ]);
  });

  it("23. a mentor with no availability rules that day returns no slots", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [],
      offering: offering(["MORNING"], 45),
    });
    expect(slots).toEqual([]);
  });

  it("24. handles multiple non-overlapping availability rules on the same day", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("09:00", "10:00"), rule("14:00", "15:00")],
      offering: offering(["MORNING", "AFTERNOON"], 30),
    });
    expect(slots.map((s) => s.startAt.toString())).toEqual([
      "2026-01-05T09:00:00Z",
      "2026-01-05T09:30:00Z",
      "2026-01-05T14:00:00Z",
      "2026-01-05T14:30:00Z",
    ]);
  });
});

describe("generateSlots — buffer and existing appointments", () => {
  it("5. buffer around an existing appointment excludes nearby candidates", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("09:00", "12:00", 15)],
      offering: offering(["MORNING"], 45),
      existingAppointments: [{ startAt: instant("2026-01-05T10:00:00Z"), endAt: instant("2026-01-05T10:45:00Z") }],
    });
    // Blocked interval (with 15min buffer) is [09:45, 11:00). Raw candidates
    // are 09:00, 09:45, 10:30, 11:15 — only 09:00 and 11:15 survive.
    expect(slots.map((s) => s.startAt.toString())).toEqual(["2026-01-05T09:00:00Z", "2026-01-05T11:15:00Z"]);
  });

  it("6. an existing confirmed appointment blocks directly overlapping candidates", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("09:00", "12:00", 0)],
      offering: offering(["MORNING"], 45),
      existingAppointments: [{ startAt: instant("2026-01-05T10:00:00Z"), endAt: instant("2026-01-05T10:45:00Z") }],
    });
    expect(slots.map((s) => s.startAt.toString())).toEqual(["2026-01-05T09:00:00Z", "2026-01-05T11:15:00Z"]);
  });

  it("8. an adjacent appointment does not count as an overlap (no buffer)", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("10:45", "11:30", 0)],
      offering: offering(["MORNING"], 45),
      existingAppointments: [{ startAt: instant("2026-01-05T10:00:00Z"), endAt: instant("2026-01-05T10:45:00Z") }],
    });
    expect(slots.map((s) => s.startAt.toString())).toEqual(["2026-01-05T10:45:00Z"]);
  });

  it("25. multiple existing appointments each apply their own buffer exclusion", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("09:00", "14:00", 15)],
      offering: offering(["MORNING", "AFTERNOON"], 45),
      existingAppointments: [
        { startAt: instant("2026-01-05T10:00:00Z"), endAt: instant("2026-01-05T10:45:00Z") },
        { startAt: instant("2026-01-05T12:30:00Z"), endAt: instant("2026-01-05T13:15:00Z") },
      ],
    });
    // Raw candidates: 09:00, 09:45, 10:30, 11:15, 12:00, 12:45.
    // Blocked #1 (+15min buffer): [09:45, 11:00) — excludes 09:45, 10:30.
    // Blocked #2 (+15min buffer): [12:15, 13:30) — excludes 12:00, 12:45.
    // 09:00 and 11:15 sit in the gap between both blocked ranges.
    expect(slots.map((s) => s.startAt.toString())).toEqual(["2026-01-05T09:00:00Z", "2026-01-05T11:15:00Z"]);
  });

  it("26. a candidate starting exactly at the buffer-expanded boundary is allowed", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("11:00", "11:45", 15)],
      offering: offering(["MORNING"], 45),
      existingAppointments: [{ startAt: instant("2026-01-05T10:00:00Z"), endAt: instant("2026-01-05T10:45:00Z") }],
    });
    // Blocked (+15min): [09:45, 11:00). Candidate starts exactly at 11:00 — not an overlap.
    expect(slots.map((s) => s.startAt.toString())).toEqual(["2026-01-05T11:00:00Z"]);
  });
});

describe("generateSlots — time-of-day category", () => {
  it("9. classifies and allows a morning candidate", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("09:00", "09:45")],
      offering: offering(["MORNING"], 45),
    });
    expect(slots).toHaveLength(1);
    expect(slots[0]!.category).toBe("MORNING");
  });

  it("10. classifies and allows an afternoon candidate", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("13:00", "13:45")],
      offering: offering(["AFTERNOON"], 45),
    });
    expect(slots).toHaveLength(1);
    expect(slots[0]!.category).toBe("AFTERNOON");
  });

  it("11. classifies and allows an evening candidate", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("18:00", "18:45")],
      offering: offering(["EVENING"], 45),
    });
    expect(slots).toHaveLength(1);
    expect(slots[0]!.category).toBe("EVENING");
  });

  it("rejects a candidate whose category the offering doesn't allow", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("09:00", "09:45")],
      offering: offering(["EVENING"], 45),
    });
    expect(slots).toEqual([]);
  });

  it("12. an offering with multiple allowed categories accepts candidates from either", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("11:00", "13:00")],
      offering: offering(["MORNING", "AFTERNOON"], 60),
    });
    expect(slots.map((s) => [s.startAt.toString(), s.category])).toEqual([
      ["2026-01-05T11:00:00Z", "MORNING"],
      ["2026-01-05T12:00:00Z", "AFTERNOON"],
    ]);
  });

  it("13. a candidate crossing a category boundary is classified by its START time, not its end", () => {
    // The spec's own worked example: 11:30-13:00 window, 60-minute offering.
    const withMorning = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("11:30", "13:00")],
      offering: offering(["MORNING"], 60),
    });
    expect(withMorning).toHaveLength(1);
    expect(withMorning[0]!.startAt.toString()).toBe("2026-01-05T11:30:00Z");
    expect(withMorning[0]!.category).toBe("MORNING");

    // The same candidate must NOT be classified as AFTERNOON just because it
    // ends at 12:30 (into the afternoon window).
    const withAfternoonOnly = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("11:30", "13:00")],
      offering: offering(["AFTERNOON"], 60),
    });
    expect(withAfternoonOnly).toEqual([]);
  });

  it("deriveAvailabilityCategory returns null outside the 06:00-23:00 defined range", () => {
    expect(deriveAvailabilityCategory(t("05:00"))).toBeNull();
    expect(deriveAvailabilityCategory(t("23:30"))).toBeNull();
    expect(deriveAvailabilityCategory(t("06:00"))).toBe("MORNING");
    expect(deriveAvailabilityCategory(t("11:59"))).toBe("MORNING");
    expect(deriveAvailabilityCategory(t("12:00"))).toBe("AFTERNOON");
    expect(deriveAvailabilityCategory(t("16:59"))).toBe("AFTERNOON");
    expect(deriveAvailabilityCategory(t("17:00"))).toBe("EVENING");
    expect(deriveAvailabilityCategory(t("22:59"))).toBe("EVENING");
  });
});

describe("generateSlots — timezone correctness", () => {
  it("14 & 15. converts mentor-local time to the correct UTC instant", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "Asia/Kolkata", // UTC+5:30, no DST
      availabilityRules: [rule("18:00", "18:45")],
      offering: offering(["EVENING"], 45),
    });
    expect(slots).toHaveLength(1);
    // 18:00 IST = 12:30 UTC same day.
    expect(slots[0]!.startAt.toString()).toBe("2026-01-05T12:30:00Z");
    expect(slots[0]!.endAt.toString()).toBe("2026-01-05T13:15:00Z");
  });

  it("16. handles a DST transition correctly for a relevant timezone (America/New_York, spring-forward 2026-03-08)", () => {
    // The day after DST starts in the US for 2026 — the zone is now EDT (UTC-4)
    // instead of EST (UTC-5). A naive fixed-offset implementation would be
    // off by an hour here.
    const dayAfterDstStart = Temporal.PlainDate.from("2026-03-09");
    const slots = generateSlots({
      ...BASE,
      localDate: dayAfterDstStart,
      timezone: "America/New_York",
      availabilityRules: [rule("18:00", "18:45")],
      offering: offering(["EVENING"], 45),
    });
    expect(slots).toHaveLength(1);
    // 18:00 EDT = 22:00 UTC (NOT 23:00, which would be the EST offset).
    expect(slots[0]!.startAt.toString()).toBe("2026-03-09T22:00:00Z");
  });
});

describe("generateSlots — minimum notice, maximum advance, past slots", () => {
  it("17. excludes candidates that don't satisfy the minimum notice period", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("08:00", "13:00")],
      offering: offering(["MORNING", "AFTERNOON"], 60),
      now: instant("2026-01-05T08:00:00Z"),
      minimumNoticeMinutes: 180, // 3 hours — earliest allowed start is 11:00
    });
    expect(slots.map((s) => s.startAt.toString())).toEqual(["2026-01-05T11:00:00Z", "2026-01-05T12:00:00Z"]);
  });

  it("18. excludes candidates beyond the maximum advance booking window", () => {
    const wednesday = Temporal.PlainDate.from("2026-01-07");
    const slots = generateSlots({
      ...BASE,
      localDate: wednesday,
      timezone: "UTC",
      availabilityRules: [rule("08:00", "13:00")],
      offering: offering(["MORNING", "AFTERNOON"], 60),
      now: instant("2026-01-05T00:00:00Z"),
      maximumAdvanceDays: 1, // horizon is 2026-01-06T00:00:00Z — Wednesday is beyond it
    });
    expect(slots).toEqual([]);
  });

  it("19. never returns a slot whose start instant is already in the past (boundary is inclusive)", () => {
    const slots = generateSlots({
      ...BASE,
      localDate: MONDAY,
      timezone: "UTC",
      availabilityRules: [rule("08:00", "13:00")],
      offering: offering(["MORNING", "AFTERNOON"], 60),
      now: instant("2026-01-05T11:00:00Z"),
      minimumNoticeMinutes: 0,
    });
    // 08:00, 09:00, 10:00 are in the past relative to now (11:00); 11:00
    // itself is exactly "now" and must be included; 12:00 is future.
    expect(slots.map((s) => s.startAt.toString())).toEqual(["2026-01-05T11:00:00Z", "2026-01-05T12:00:00Z"]);
  });
});
