import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import {
  registerMentorAndGetAuthCookie,
  registerCustomerAndGetAuthCookie,
  registerMentor,
  getCookie,
} from "./helpers.js";

const validOffering = {
  name: "Career Deep Dive",
  description: "A focused session on your career trajectory.",
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
  endTime: "19:00",
  bufferMinutes: 15,
};

/** Registers a mentor and drives them through every onboarding step so they end up bookable. */
async function makeReadyMentor() {
  const { authCookie, userId } = await registerMentorAndGetAuthCookie();

  await request(app)
    .patch("/api/mentor/profile")
    .set("Cookie", authCookie)
    .send({ headline: "Senior Engineer", bio: "8 years of experience.", timezone: "Asia/Kolkata" });

  const offeringRes = await request(app)
    .post("/api/mentor/offerings")
    .set("Cookie", authCookie)
    .send(validOffering);
  const offeringId = offeringRes.body.data.offering.id as string;

  const ruleRes = await request(app)
    .post("/api/mentor/availability")
    .set("Cookie", authCookie)
    .send(validAvailabilityRule);
  const ruleId = ruleRes.body.data.rule.id as string;

  const acceptRes = await request(app)
    .patch("/api/mentor/profile")
    .set("Cookie", authCookie)
    .send({ acceptingBookings: true });

  const mentorProfileId = acceptRes.body.data.profile.id as string;

  return { authCookie, userId, offeringId, ruleId, mentorProfileId };
}

describe("Mentor profile", () => {
  it("lets a mentor retrieve their own profile", async () => {
    const { authCookie } = await registerMentorAndGetAuthCookie();
    const res = await request(app).get("/api/mentor/profile").set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.profile).toMatchObject({ onboardingComplete: false, acceptingBookings: false });
    expect(res.body.data.readiness.isBookable).toBe(false);
    expect(res.body.data.experienceEntries).toEqual([]);
  });

  it("lets a mentor update their own profile", async () => {
    const { authCookie } = await registerMentorAndGetAuthCookie();
    const res = await request(app)
      .patch("/api/mentor/profile")
      .set("Cookie", authCookie)
      .send({ headline: "Staff Engineer", timezone: "America/New_York" });
    expect(res.status).toBe(200);
    expect(res.body.data.profile.headline).toBe("Staff Engineer");
    expect(res.body.data.profile.timezone).toBe("America/New_York");
  });

  it("rejects customers from mentor management endpoints", async () => {
    const { authCookie } = await registerCustomerAndGetAuthCookie();
    const res = await request(app).get("/api/mentor/profile").set("Cookie", authCookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("only ever updates the authenticated mentor's own profile, never another mentor's", async () => {
    const mentorA = await registerMentorAndGetAuthCookie();
    const mentorB = await registerMentorAndGetAuthCookie();

    await request(app).patch("/api/mentor/profile").set("Cookie", mentorB.authCookie).send({ headline: "B's headline" });

    const profileA = await prisma.mentorProfile.findUnique({ where: { userId: mentorA.userId } });
    expect(profileA?.headline).toBeNull();

    const profileB = await prisma.mentorProfile.findUnique({ where: { userId: mentorB.userId } });
    expect(profileB?.headline).toBe("B's headline");
  });

  it("rejects an invalid IANA timezone", async () => {
    const { authCookie } = await registerMentorAndGetAuthCookie();
    const res = await request(app)
      .patch("/api/mentor/profile")
      .set("Cookie", authCookie)
      .send({ timezone: "Not/A_Real_Zone" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("Mentor experience", () => {
  it("lets a mentor create an experience entry", async () => {
    const { authCookie } = await registerMentorAndGetAuthCookie();
    const res = await request(app)
      .post("/api/mentor/experience")
      .set("Cookie", authCookie)
      .send({ organization: "Company X", role: "Senior Engineer", startDate: "2021-01-01" });
    expect(res.status).toBe(201);
    expect(res.body.data.experienceEntry).toMatchObject({ organization: "Company X", role: "Senior Engineer", order: 0 });
  });

  it("lets a mentor update their own experience entry", async () => {
    const { authCookie } = await registerMentorAndGetAuthCookie();
    const createRes = await request(app)
      .post("/api/mentor/experience")
      .set("Cookie", authCookie)
      .send({ organization: "Company X", role: "Engineer", startDate: "2021-01-01" });
    const id = createRes.body.data.experienceEntry.id;

    const updateRes = await request(app)
      .patch(`/api/mentor/experience/${id}`)
      .set("Cookie", authCookie)
      .send({ role: "Staff Engineer" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.experienceEntry.role).toBe("Staff Engineer");
  });

  it("rejects a mentor modifying another mentor's experience entry", async () => {
    const mentorA = await registerMentorAndGetAuthCookie();
    const mentorB = await registerMentorAndGetAuthCookie();

    const createRes = await request(app)
      .post("/api/mentor/experience")
      .set("Cookie", mentorA.authCookie)
      .send({ organization: "Company X", role: "Engineer", startDate: "2021-01-01" });
    const id = createRes.body.data.experienceEntry.id;

    const attack = await request(app)
      .patch(`/api/mentor/experience/${id}`)
      .set("Cookie", mentorB.authCookie)
      .send({ role: "Hacked" });
    expect(attack.status).toBe(403);

    const deleteAttack = await request(app).delete(`/api/mentor/experience/${id}`).set("Cookie", mentorB.authCookie);
    expect(deleteAttack.status).toBe(403);
  });

  it("rejects an endDate before startDate", async () => {
    const { authCookie } = await registerMentorAndGetAuthCookie();
    const res = await request(app)
      .post("/api/mentor/experience")
      .set("Cookie", authCookie)
      .send({ organization: "Company X", role: "Engineer", startDate: "2021-01-01", endDate: "2020-01-01" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("Mentor offerings", () => {
  it("lists a mentor's own offerings with price as a JSON number", async () => {
    const { authCookie } = await registerMentorAndGetAuthCookie();
    await request(app).post("/api/mentor/offerings").set("Cookie", authCookie).send(validOffering);

    const res = await request(app).get("/api/mentor/offerings").set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.offerings).toHaveLength(1);
    expect(res.body.data.offerings[0].price).toBe(400);
    expect(typeof res.body.data.offerings[0].price).toBe("number");
  });

  it("lets a mentor create an offering", async () => {
    const { authCookie } = await registerMentorAndGetAuthCookie();
    const res = await request(app).post("/api/mentor/offerings").set("Cookie", authCookie).send(validOffering);
    expect(res.status).toBe(201);
    expect(res.body.data.offering).toMatchObject({ name: "Career Deep Dive", isActive: true, price: 400 });
    expect(typeof res.body.data.offering.price).toBe("number");
  });

  it("lets a mentor update their own offering", async () => {
    const { authCookie } = await registerMentorAndGetAuthCookie();
    const createRes = await request(app).post("/api/mentor/offerings").set("Cookie", authCookie).send(validOffering);
    const id = createRes.body.data.offering.id;

    const updateRes = await request(app)
      .patch(`/api/mentor/offerings/${id}`)
      .set("Cookie", authCookie)
      .send({ price: 500 });
    expect(updateRes.status).toBe(200);
    // price must be a real JSON number, not a stringified Decimal — a raw
    // Prisma Decimal serializes via toJSON() as a string, which is exactly
    // the class of bug this asserts against (found and fixed in Phase 8).
    expect(updateRes.body.data.offering.price).toBe(500);
    expect(typeof updateRes.body.data.offering.price).toBe("number");
  });

  it("rejects a mentor modifying another mentor's offering", async () => {
    const mentorA = await registerMentorAndGetAuthCookie();
    const mentorB = await registerMentorAndGetAuthCookie();

    const createRes = await request(app).post("/api/mentor/offerings").set("Cookie", mentorA.authCookie).send(validOffering);
    const id = createRes.body.data.offering.id;

    const attack = await request(app)
      .patch(`/api/mentor/offerings/${id}`)
      .set("Cookie", mentorB.authCookie)
      .send({ price: 1 });
    expect(attack.status).toBe(403);
  });

  it("rejects invalid duration, price, category, and connection mode", async () => {
    const { authCookie } = await registerMentorAndGetAuthCookie();

    const badDuration = await request(app)
      .post("/api/mentor/offerings")
      .set("Cookie", authCookie)
      .send({ ...validOffering, durationMinutes: 5 });
    expect(badDuration.status).toBe(400);

    const badPrice = await request(app)
      .post("/api/mentor/offerings")
      .set("Cookie", authCookie)
      .send({ ...validOffering, price: -10 });
    expect(badPrice.status).toBe(400);

    const badCategory = await request(app)
      .post("/api/mentor/offerings")
      .set("Cookie", authCookie)
      .send({ ...validOffering, category: "NOT_A_CATEGORY" });
    expect(badCategory.status).toBe(400);

    const badMode = await request(app)
      .post("/api/mentor/offerings")
      .set("Cookie", authCookie)
      .send({ ...validOffering, connectionModes: ["CARRIER_PIGEON"] });
    expect(badMode.status).toBe(400);

    const noModes = await request(app)
      .post("/api/mentor/offerings")
      .set("Cookie", authCookie)
      .send({ ...validOffering, connectionModes: [] });
    expect(noModes.status).toBe(400);
  });

  it("deactivating an offering with existing appointments archives it instead of deleting, leaving appointments intact", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();

    const appointment = await prisma.appointment.create({
      data: {
        customerId: customer.userId,
        mentorProfileId: mentor.mentorProfileId,
        offeringId: mentor.offeringId,
        startAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
        status: "CONFIRMED",
        connectionMode: "GOOGLE_MEET",
        mentorTimezone: "Asia/Kolkata",
        offeringSnapshot: { name: "Career Deep Dive", durationMinutes: 45, price: 400, currency: "INR" },
      },
    });

    const res = await request(app).delete(`/api/mentor/offerings/${mentor.offeringId}`).set("Cookie", mentor.authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(false);
    expect(res.body.data.archived).toBe(true);
    expect(res.body.data.offering.isActive).toBe(false);
    // The archive branch also returns an offering object — must get the
    // same Decimal-to-number fix as create/update/list.
    expect(res.body.data.offering.price).toBe(400);
    expect(typeof res.body.data.offering.price).toBe("number");

    const stillThere = await prisma.appointment.findUnique({ where: { id: appointment.id } });
    expect(stillThere).not.toBeNull();
    expect(stillThere?.status).toBe("CONFIRMED");
    expect(stillThere?.offeringId).toBe(mentor.offeringId);

    const offeringStillExists = await prisma.offering.findUnique({ where: { id: mentor.offeringId } });
    expect(offeringStillExists).not.toBeNull();
  });

  it("hard-deletes an offering that has never been booked", async () => {
    const { authCookie } = await registerMentorAndGetAuthCookie();
    const createRes = await request(app).post("/api/mentor/offerings").set("Cookie", authCookie).send(validOffering);
    const id = createRes.body.data.offering.id;

    const res = await request(app).delete(`/api/mentor/offerings/${id}`).set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
    expect(res.body.data.archived).toBe(false);

    const gone = await prisma.offering.findUnique({ where: { id } });
    expect(gone).toBeNull();
  });
});

describe("Mentor availability", () => {
  it("lets a mentor create an availability rule once timezone is configured", async () => {
    const { authCookie } = await registerMentorAndGetAuthCookie();
    await request(app).patch("/api/mentor/profile").set("Cookie", authCookie).send({ timezone: "Asia/Kolkata" });

    const res = await request(app).post("/api/mentor/availability").set("Cookie", authCookie).send(validAvailabilityRule);
    expect(res.status).toBe(201);
    expect(res.body.data.rule).toMatchObject({ dayOfWeek: "MONDAY", startTime: "18:00", endTime: "19:00" });
  });

  it("rejects creating availability without a configured timezone", async () => {
    const { authCookie } = await registerMentorAndGetAuthCookie();
    const res = await request(app).post("/api/mentor/availability").set("Cookie", authCookie).send(validAvailabilityRule);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("TIMEZONE_NOT_CONFIGURED");
  });

  it("rejects an invalid time range", async () => {
    const { authCookie } = await registerMentorAndGetAuthCookie();
    await request(app).patch("/api/mentor/profile").set("Cookie", authCookie).send({ timezone: "Asia/Kolkata" });

    const res = await request(app)
      .post("/api/mentor/availability")
      .set("Cookie", authCookie)
      .send({ ...validAvailabilityRule, startTime: "19:00", endTime: "18:00" });
    expect(res.status).toBe(400);
  });

  it("rejects a negative buffer", async () => {
    const { authCookie } = await registerMentorAndGetAuthCookie();
    await request(app).patch("/api/mentor/profile").set("Cookie", authCookie).send({ timezone: "Asia/Kolkata" });

    const res = await request(app)
      .post("/api/mentor/availability")
      .set("Cookie", authCookie)
      .send({ ...validAvailabilityRule, bufferMinutes: -5 });
    expect(res.status).toBe(400);
  });

  it("rejects a mentor modifying another mentor's availability rule", async () => {
    const mentorA = await registerMentorAndGetAuthCookie();
    await request(app).patch("/api/mentor/profile").set("Cookie", mentorA.authCookie).send({ timezone: "Asia/Kolkata" });
    const createRes = await request(app)
      .post("/api/mentor/availability")
      .set("Cookie", mentorA.authCookie)
      .send(validAvailabilityRule);
    const id = createRes.body.data.rule.id;

    const mentorB = await registerMentorAndGetAuthCookie();
    const attack = await request(app)
      .patch(`/api/mentor/availability/${id}`)
      .set("Cookie", mentorB.authCookie)
      .send({ bufferMinutes: 0 });
    expect(attack.status).toBe(403);

    const deleteAttack = await request(app).delete(`/api/mentor/availability/${id}`).set("Cookie", mentorB.authCookie);
    expect(deleteAttack.status).toBe(403);
  });
});

describe("Mentor onboarding readiness", () => {
  it("marks a newly registered mentor as incomplete", async () => {
    const { res } = await registerMentor();
    const email = res.body.data.user.email;
    const user = await prisma.user.findUniqueOrThrow({ where: { email }, include: { mentorProfile: true } });
    expect(user.mentorProfile?.onboardingComplete).toBe(false);
    expect(user.mentorProfile?.acceptingBookings).toBe(false);
    expect(user.mentorProfile?.timezone).toBeNull();
  });

  it("does not allow an incomplete mentor to enable accepting bookings", async () => {
    const { authCookie } = await registerMentorAndGetAuthCookie();
    const res = await request(app)
      .patch("/api/mentor/profile")
      .set("Cookie", authCookie)
      .send({ acceptingBookings: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("ONBOARDING_INCOMPLETE");
  });

  it("allows a fully complete mentor to enable accepting bookings, and persists onboardingComplete", async () => {
    const mentor = await makeReadyMentor();
    const profile = await prisma.mentorProfile.findUniqueOrThrow({ where: { id: mentor.mentorProfileId } });
    expect(profile.acceptingBookings).toBe(true);
    expect(profile.onboardingComplete).toBe(true);
  });

  it("stops being bookable once its only active offering is deactivated", async () => {
    const mentor = await makeReadyMentor();

    await request(app)
      .patch(`/api/mentor/offerings/${mentor.offeringId}`)
      .set("Cookie", mentor.authCookie)
      .send({ isActive: false });

    const profile = await prisma.mentorProfile.findUniqueOrThrow({ where: { id: mentor.mentorProfileId } });
    expect(profile.onboardingComplete).toBe(false);

    const getRes = await request(app).get("/api/mentor/profile").set("Cookie", mentor.authCookie);
    expect(getRes.body.data.readiness.isBookable).toBe(false);
    expect(getRes.body.data.readiness.hasActiveOffering).toBe(false);
  });

  it("stops being bookable once its only availability rule is removed", async () => {
    const mentor = await makeReadyMentor();

    await request(app).delete(`/api/mentor/availability/${mentor.ruleId}`).set("Cookie", mentor.authCookie);

    const profile = await prisma.mentorProfile.findUniqueOrThrow({ where: { id: mentor.mentorProfileId } });
    expect(profile.onboardingComplete).toBe(false);
  });

  it("keeps existing appointments intact when availability is removed or acceptingBookings is turned off", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();

    const appointment = await prisma.appointment.create({
      data: {
        customerId: customer.userId,
        mentorProfileId: mentor.mentorProfileId,
        offeringId: mentor.offeringId,
        startAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
        status: "CONFIRMED",
        connectionMode: "GOOGLE_MEET",
        mentorTimezone: "Asia/Kolkata",
        offeringSnapshot: { name: "Career Deep Dive", durationMinutes: 45, price: 400, currency: "INR" },
      },
    });

    await request(app).delete(`/api/mentor/availability/${mentor.ruleId}`).set("Cookie", mentor.authCookie);
    await request(app)
      .patch("/api/mentor/profile")
      .set("Cookie", mentor.authCookie)
      .send({ acceptingBookings: false });

    const stillThere = await prisma.appointment.findUnique({ where: { id: appointment.id } });
    expect(stillThere).not.toBeNull();
    expect(stillThere?.status).toBe("CONFIRMED");
  });
});
