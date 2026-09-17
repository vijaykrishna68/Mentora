import request from "supertest";
import { app } from "../src/app.js";

export function uniqueEmail(label: string): string {
  return `${label}.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;
}

export async function registerCustomer(overrides: Partial<Record<string, unknown>> = {}) {
  const email = uniqueEmail("customer");
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      role: "CUSTOMER",
      email,
      password: "correct-horse-battery-staple",
      name: "Test Customer",
      interests: ["CAREER_GROWTH"],
      ...overrides,
    });
  return { res, email };
}

export async function registerMentor(overrides: Partial<Record<string, unknown>> = {}) {
  const email = uniqueEmail("mentor");
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      role: "MENTOR",
      email,
      password: "correct-horse-battery-staple",
      name: "Test Mentor",
      ...overrides,
    });
  return { res, email };
}

export function getCookie(res: request.Response, name: string): string | undefined {
  const raw = res.headers["set-cookie"];
  const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const match = cookies.find((c) => c.startsWith(`${name}=`));
  return match?.split(";")[0]?.split("=")[1];
}

/** Registers a mentor and returns their access-token cookie header, ready to attach to requests. */
export async function registerMentorAndGetAuthCookie(overrides: Partial<Record<string, unknown>> = {}) {
  const { res, email } = await registerMentor(overrides);
  const accessToken = getCookie(res, "accessToken");
  return { authCookie: `accessToken=${accessToken}`, email, userId: res.body.data.user.id as string };
}

export async function registerCustomerAndGetAuthCookie(overrides: Partial<Record<string, unknown>> = {}) {
  const { res, email } = await registerCustomer(overrides);
  const accessToken = getCookie(res, "accessToken");
  return { authCookie: `accessToken=${accessToken}`, email, userId: res.body.data.user.id as string };
}

const ISO_DAY_NAMES = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

/** Next UTC calendar date (YYYY-MM-DD) on the given ISO day-of-week (1=Mon..7=Sun), at least `minDaysAhead` away. */
export function nextDateForIsoDayOfWeek(isoDayOfWeek: number, minDaysAhead = 7): string {
  const now = new Date();
  let candidate = new Date(now.getTime() + minDaysAhead * 24 * 60 * 60 * 1000);
  // getUTCDay(): 0=Sun..6=Sat: convert to ISO (1=Mon..7=Sun).
  const isoOf = (d: Date) => ((d.getUTCDay() + 6) % 7) + 1;
  while (isoOf(candidate) !== isoDayOfWeek) {
    candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
  }
  return candidate.toISOString().slice(0, 10);
}

export interface ReadyMentor {
  authCookie: string;
  userId: string;
  mentorProfileId: string;
  offeringId: string;
  ruleId: string;
  dayOfWeek: string;
  timezone: string;
}

/**
 * Registers a mentor and drives them through onboarding so they're fully
 * bookable: profile info + timezone, one active offering, one active
 * availability rule, acceptingBookings=true, generous notice/advance so
 * tests don't fight those constraints unless they're specifically testing them.
 */
export async function makeReadyMentor(
  options: {
    timezone?: string;
    dayOfWeek?: string;
    startTime?: string;
    endTime?: string;
    bufferMinutes?: number;
    offeringCategory?: string;
    availabilityCategories?: string[];
    connectionModes?: string[];
    offeringConnectionModes?: string[];
    minimumNoticeMinutes?: number;
    maximumAdvanceDays?: number;
    phone?: string;
  } = {},
): Promise<ReadyMentor & { offeringConnectionModes: string[] }> {
  const timezone = options.timezone ?? "UTC";
  const dayOfWeek = options.dayOfWeek ?? "MONDAY";
  const connectionModes = options.connectionModes ?? ["GOOGLE_MEET", "PHONE"];
  const offeringConnectionModes = options.offeringConnectionModes ?? connectionModes;
  const availabilityCategories = options.availabilityCategories ?? ["EVENING"];

  const { authCookie, userId } = await registerMentorAndGetAuthCookie();

  await request(app)
    .patch("/api/mentor/profile")
    .set("Cookie", authCookie)
    .send({
      headline: "Senior Engineer",
      bio: "Years of experience mentoring engineers.",
      timezone,
      connectionModes,
      phone: options.phone ?? "+1-555-0100",
    });

  const offeringRes = await request(app)
    .post("/api/mentor/offerings")
    .set("Cookie", authCookie)
    .send({
      name: "Career Deep Dive",
      category: options.offeringCategory ?? "CAREER_GROWTH",
      durationMinutes: 45,
      price: 400,
      currency: "INR",
      connectionModes: offeringConnectionModes,
      availabilityCategories,
    });
  const offeringId = offeringRes.body.data.offering.id as string;

  const ruleRes = await request(app)
    .post("/api/mentor/availability")
    .set("Cookie", authCookie)
    .send({
      dayOfWeek,
      startTime: options.startTime ?? "18:00",
      endTime: options.endTime ?? "20:00",
      bufferMinutes: options.bufferMinutes ?? 15,
    });
  const ruleId = ruleRes.body.data.rule.id as string;

  const acceptRes = await request(app)
    .patch("/api/mentor/profile")
    .set("Cookie", authCookie)
    .send({
      acceptingBookings: true,
      minimumNoticeMinutes: options.minimumNoticeMinutes ?? 0,
      maximumAdvanceDays: options.maximumAdvanceDays ?? 365,
    });
  const mentorProfileId = acceptRes.body.data.profile.id as string;

  return { authCookie, userId, mentorProfileId, offeringId, ruleId, dayOfWeek, timezone, offeringConnectionModes };
}

export const ISO_DAY_OF_WEEK_NAMES = ISO_DAY_NAMES;
