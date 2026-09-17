import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { registerMentorAndGetAuthCookie, registerCustomerAndGetAuthCookie } from "./helpers.js";

const validOffering = {
  name: "Career Deep Dive",
  category: "CAREER_GROWTH",
  durationMinutes: 45,
  price: 400,
  currency: "INR",
  connectionModes: ["GOOGLE_MEET"],
  availabilityCategories: ["EVENING"],
};

const validAvailabilityRule = {
  dayOfWeek: "MONDAY",
  startTime: "18:00",
  endTime: "20:00",
  bufferMinutes: 15,
};

/** Registers a mentor and drives them through onboarding so they're bookable. */
async function makeReadyMentor() {
  const { authCookie, userId } = await registerMentorAndGetAuthCookie();

  await request(app)
    .patch("/api/mentor/profile")
    .set("Cookie", authCookie)
    .send({ headline: "Senior Engineer", bio: "8 years of experience.", timezone: "UTC" });

  const offeringRes = await request(app).post("/api/mentor/offerings").set("Cookie", authCookie).send(validOffering);
  const offeringId = offeringRes.body.data.offering.id as string;

  const ruleRes = await request(app)
    .post("/api/mentor/availability")
    .set("Cookie", authCookie)
    .send(validAvailabilityRule);
  const ruleId = ruleRes.body.data.rule.id as string;

  const acceptRes = await request(app)
    .patch("/api/mentor/profile")
    .set("Cookie", authCookie)
    .send({ acceptingBookings: true, minimumNoticeMinutes: 0, maximumAdvanceDays: 365 });

  const mentorProfileId = acceptRes.body.data.profile.id as string;

  return { authCookie, userId, offeringId, ruleId, mentorProfileId };
}

/** Next date (today inclusive) on the given ISO day-of-week (1=Mon..7=Sun), at least a week out. */
function nextMonday(): string {
  const now = new Date();
  const daysUntilNextMonday = ((1 - now.getUTCDay() + 7) % 7) + 7; // always at least a week ahead
  const target = new Date(now.getTime() + daysUntilNextMonday * 24 * 60 * 60 * 1000);
  return target.toISOString().slice(0, 10);
}

describe("GET /api/mentors/:mentorId/availability", () => {
  it("does not require authentication", async () => {
    const mentor = await makeReadyMentor();
    const res = await request(app).get(
      `/api/mentors/${mentor.mentorProfileId}/availability?offeringId=${mentor.offeringId}&date=${nextMonday()}`,
    );
    expect(res.status).toBe(200);
  });

  it("returns generated slots for a bookable mentor", async () => {
    const mentor = await makeReadyMentor();
    const date = nextMonday();
    const res = await request(app).get(
      `/api/mentors/${mentor.mentorProfileId}/availability?offeringId=${mentor.offeringId}&date=${date}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.date).toBe(date);
    expect(res.body.data.timezone).toBe("UTC");
    expect(res.body.data.slots.length).toBeGreaterThan(0);
    for (const slot of res.body.data.slots) {
      expect(new Date(slot.startAt).getTime()).toBeLessThan(new Date(slot.endAt).getTime());
      expect(slot.category).toBe("EVENING");
    }
    // No private mentor-management fields anywhere in the public response.
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain("acceptingBookings");
    expect(JSON.stringify(res.body)).not.toContain("onboardingComplete");
  });

  it("7. a cancelled appointment does not block availability", async () => {
    const mentor = await makeReadyMentor();
    const date = nextMonday();

    const withoutCancelled = await request(app).get(
      `/api/mentors/${mentor.mentorProfileId}/availability?offeringId=${mentor.offeringId}&date=${date}`,
    );
    const slotCountBefore = withoutCancelled.body.data.slots.length;

    const customer = await registerCustomerAndGetAuthCookie();
    const firstSlot = withoutCancelled.body.data.slots[0];
    await prisma.appointment.create({
      data: {
        customerId: customer.userId,
        mentorProfileId: mentor.mentorProfileId,
        offeringId: mentor.offeringId,
        startAt: new Date(firstSlot.startAt),
        endAt: new Date(firstSlot.endAt),
        status: "CANCELLED",
        connectionMode: "GOOGLE_MEET",
        mentorTimezone: "UTC",
        offeringSnapshot: { name: "Career Deep Dive", durationMinutes: 45, price: 400, currency: "INR" },
      },
    });

    const afterCancelled = await request(app).get(
      `/api/mentors/${mentor.mentorProfileId}/availability?offeringId=${mentor.offeringId}&date=${date}`,
    );
    expect(afterCancelled.body.data.slots.length).toBe(slotCountBefore);
    expect(afterCancelled.body.data.slots).toContainEqual(firstSlot);
  });

  it("20. a mentor not accepting bookings returns no bookable slots (not an error)", async () => {
    const mentor = await makeReadyMentor();
    await request(app).patch("/api/mentor/profile").set("Cookie", mentor.authCookie).send({ acceptingBookings: false });

    const res = await request(app).get(
      `/api/mentors/${mentor.mentorProfileId}/availability?offeringId=${mentor.offeringId}&date=${nextMonday()}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.slots).toEqual([]);
  });

  it("21. rejects an inactive offering", async () => {
    const mentor = await makeReadyMentor();
    // Keep the mentor bookable overall (a second active offering) so
    // deactivating the first one isolates the offering-inactive check rather
    // than cascading into "mentor has no active offerings at all".
    await request(app).post("/api/mentor/offerings").set("Cookie", mentor.authCookie).send(validOffering);
    await request(app)
      .patch(`/api/mentor/offerings/${mentor.offeringId}`)
      .set("Cookie", mentor.authCookie)
      .send({ isActive: false });

    const res = await request(app).get(
      `/api/mentors/${mentor.mentorProfileId}/availability?offeringId=${mentor.offeringId}&date=${nextMonday()}`,
    );
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("OFFERING_INACTIVE");
  });

  it("22. rejects an offering that belongs to a different mentor", async () => {
    const mentorA = await makeReadyMentor();
    const mentorB = await makeReadyMentor();

    const res = await request(app).get(
      `/api/mentors/${mentorA.mentorProfileId}/availability?offeringId=${mentorB.offeringId}&date=${nextMonday()}`,
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("OFFERING_NOT_FOUND");
  });

  it("23. a mentor with no availability rules on the requested day returns no slots", async () => {
    const mentor = await makeReadyMentor();
    // The rule is MONDAY only — request a Tuesday instead.
    const nextMondayDate = new Date(nextMonday());
    const tuesday = new Date(nextMondayDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const res = await request(app).get(
      `/api/mentors/${mentor.mentorProfileId}/availability?offeringId=${mentor.offeringId}&date=${tuesday}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.slots).toEqual([]);
  });

  it("returns 404 for a mentor that doesn't exist", async () => {
    const res = await request(app).get(
      `/api/mentors/00000000-0000-0000-0000-000000000000/availability?offeringId=00000000-0000-0000-0000-000000000000&date=${nextMonday()}`,
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("MENTOR_NOT_FOUND");
  });

  it("rejects malformed mentorId/offeringId/date", async () => {
    const mentor = await makeReadyMentor();

    const badMentorId = await request(app).get(`/api/mentors/not-a-uuid/availability?offeringId=${mentor.offeringId}&date=${nextMonday()}`);
    expect(badMentorId.status).toBe(400);

    const badOfferingId = await request(app).get(
      `/api/mentors/${mentor.mentorProfileId}/availability?offeringId=not-a-uuid&date=${nextMonday()}`,
    );
    expect(badOfferingId.status).toBe(400);

    const badDateFormat = await request(app).get(
      `/api/mentors/${mentor.mentorProfileId}/availability?offeringId=${mentor.offeringId}&date=09-20-2026`,
    );
    expect(badDateFormat.status).toBe(400);

    const invalidCalendarDate = await request(app).get(
      `/api/mentors/${mentor.mentorProfileId}/availability?offeringId=${mentor.offeringId}&date=2026-02-30`,
    );
    expect(invalidCalendarDate.status).toBe(400);
  });
});
