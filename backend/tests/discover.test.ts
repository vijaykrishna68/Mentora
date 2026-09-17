import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { makeReadyMentor, registerMentorAndGetAuthCookie, registerCustomerAndGetAuthCookie, nextDateForIsoDayOfWeek } from "./helpers.js";

function mondayAt(time: string, minDaysAhead = 7): string {
  const date = nextDateForIsoDayOfWeek(1, minDaysAhead);
  return `${date}T${time}:00.000Z`;
}

async function bookSlot(authCookie: string, mentorId: string, offeringId: string, startAt: string, connectionMode = "GOOGLE_MEET") {
  return request(app).post("/api/appointments").set("Cookie", authCookie).send({ mentorId, offeringId, startAt, connectionMode });
}

function pastWindow(hoursAgo: number, durationMinutes = 45) {
  const startAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
  return { startAt, endAt };
}

async function createDirectAppointment(params: {
  customerId: string;
  mentorProfileId: string;
  offeringId: string;
  startAt: Date;
  endAt: Date;
  status?: "CONFIRMED" | "CANCELLED";
}) {
  return prisma.appointment.create({
    data: {
      customerId: params.customerId,
      mentorProfileId: params.mentorProfileId,
      offeringId: params.offeringId,
      startAt: params.startAt,
      endAt: params.endAt,
      status: params.status ?? "CONFIRMED",
      connectionMode: "GOOGLE_MEET",
      mentorTimezone: "UTC",
      offeringSnapshot: { name: "Career Deep Dive", durationMinutes: 45, price: 400, currency: "INR" },
    },
  });
}

describe("Public access", () => {
  it("1. GET /api/mentors works without authentication", async () => {
    await makeReadyMentor();
    const res = await request(app).get("/api/mentors");
    expect(res.status).toBe(200);
  });

  it("2. GET /api/mentors/:id works without authentication", async () => {
    const mentor = await makeReadyMentor();
    const res = await request(app).get(`/api/mentors/${mentor.mentorProfileId}`);
    expect(res.status).toBe(200);
  });

  it("3. the existing public availability endpoint remains accessible", async () => {
    const mentor = await makeReadyMentor();
    const date = nextDateForIsoDayOfWeek(1, 7);
    const res = await request(app).get(`/api/mentors/${mentor.mentorProfileId}/availability?offeringId=${mentor.offeringId}&date=${date}`);
    expect(res.status).toBe(200);
    expect(res.body.data.slots.length).toBeGreaterThan(0);
  });
});

describe("Bookability filtering", () => {
  it("4. excludes an incomplete mentor", async () => {
    const { userId } = await registerMentorAndGetAuthCookie();
    const profile = await prisma.mentorProfile.findUniqueOrThrow({ where: { userId } });

    const res = await request(app).get("/api/mentors");
    expect(res.body.data.mentors.some((m: { id: string }) => m.id === profile.id)).toBe(false);
  });

  it("5. excludes a mentor with no active offering", async () => {
    const mentor = await makeReadyMentor();
    await request(app).patch(`/api/mentor/offerings/${mentor.offeringId}`).set("Cookie", mentor.authCookie).send({ isActive: false });

    const res = await request(app).get("/api/mentors");
    expect(res.body.data.mentors.some((m: { id: string }) => m.id === mentor.mentorProfileId)).toBe(false);
  });

  it("6. excludes a mentor with no active availability rule", async () => {
    const mentor = await makeReadyMentor();
    await request(app).delete(`/api/mentor/availability/${mentor.ruleId}`).set("Cookie", mentor.authCookie);

    const res = await request(app).get("/api/mentors");
    expect(res.body.data.mentors.some((m: { id: string }) => m.id === mentor.mentorProfileId)).toBe(false);
  });

  it("7. excludes a mentor not accepting bookings", async () => {
    const mentor = await makeReadyMentor();
    await request(app).patch("/api/mentor/profile").set("Cookie", mentor.authCookie).send({ acceptingBookings: false });

    const res = await request(app).get("/api/mentors");
    expect(res.body.data.mentors.some((m: { id: string }) => m.id === mentor.mentorProfileId)).toBe(false);
  });

  it("8. includes a fully ready mentor", async () => {
    const mentor = await makeReadyMentor();
    const res = await request(app).get("/api/mentors");
    expect(res.body.data.mentors.some((m: { id: string }) => m.id === mentor.mentorProfileId)).toBe(true);
  });

  it("9. existing appointments/reviews do not incorrectly change discoverability", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const { startAt, endAt } = pastWindow(48);
    const appointment = await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, startAt, endAt });
    await request(app).post(`/api/appointments/${appointment.id}/review`).set("Cookie", customer.authCookie).send({ rating: 5 });

    const booked = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));
    await request(app).patch(`/api/appointments/${booked.body.data.appointment.id}/cancel`).set("Cookie", customer.authCookie);

    const res = await request(app).get("/api/mentors");
    expect(res.body.data.mentors.some((m: { id: string }) => m.id === mentor.mentorProfileId)).toBe(true);
  });
});

describe("Filtering", () => {
  it("10. filters by category", async () => {
    const mentorA = await makeReadyMentor({ offeringCategory: "FRONTEND" });
    await request(app).patch("/api/mentor/profile").set("Cookie", mentorA.authCookie).send({ primaryCategory: "FRONTEND" });
    const mentorB = await makeReadyMentor({ offeringCategory: "BACKEND" });
    await request(app).patch("/api/mentor/profile").set("Cookie", mentorB.authCookie).send({ primaryCategory: "BACKEND" });

    const res = await request(app).get("/api/mentors?category=FRONTEND");
    const ids = res.body.data.mentors.map((m: { id: string }) => m.id);
    expect(ids).toContain(mentorA.mentorProfileId);
    expect(ids).not.toContain(mentorB.mentorProfileId);
  });

  it("11 & 12. search matches name/headline case-insensitively", async () => {
    const mentor = await makeReadyMentor();
    await request(app).patch("/api/mentor/profile").set("Cookie", mentor.authCookie).send({ headline: "Distinguished Rocketry Coach" });

    const res = await request(app).get("/api/mentors?q=rocketry");
    expect(res.body.data.mentors.some((m: { id: string }) => m.id === mentor.mentorProfileId)).toBe(true);

    const upper = await request(app).get("/api/mentors?q=ROCKETRY");
    expect(upper.body.data.mentors.some((m: { id: string }) => m.id === mentor.mentorProfileId)).toBe(true);

    const noMatch = await request(app).get("/api/mentors?q=nonexistent-search-term-xyz");
    expect(noMatch.body.data.mentors.some((m: { id: string }) => m.id === mentor.mentorProfileId)).toBe(false);
  });

  it("13. rejects an invalid category", async () => {
    const res = await request(app).get("/api/mentors?category=NOT_A_REAL_CATEGORY");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("14. combines search and category", async () => {
    const mentor = await makeReadyMentor({ offeringCategory: "FRONTEND" });
    await request(app).patch("/api/mentor/profile").set("Cookie", mentor.authCookie).send({ primaryCategory: "FRONTEND", headline: "Frontend Architecture Guru" });

    const matches = await request(app).get("/api/mentors?category=FRONTEND&q=Architecture");
    expect(matches.body.data.mentors.some((m: { id: string }) => m.id === mentor.mentorProfileId)).toBe(true);

    const mismatchedCategory = await request(app).get("/api/mentors?category=BACKEND&q=Architecture");
    expect(mismatchedCategory.body.data.mentors.some((m: { id: string }) => m.id === mentor.mentorProfileId)).toBe(false);
  });
});

describe("Sorting", () => {
  it("15. supports newest, rating, and sessions sort values", async () => {
    for (const sort of ["newest", "rating", "sessions"]) {
      const res = await request(app).get(`/api/mentors?sort=${sort}`);
      expect(res.status).toBe(200);
    }
  });

  it("15b. rating sort orders higher-rated mentors first", async () => {
    const lowRated = await makeReadyMentor();
    const highRated = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();

    const lowAppt = await createDirectAppointment({ customerId: customer.userId, mentorProfileId: lowRated.mentorProfileId, offeringId: lowRated.offeringId, ...pastWindow(72) });
    await prisma.review.create({ data: { appointmentId: lowAppt.id, customerId: customer.userId, mentorProfileId: lowRated.mentorProfileId, rating: 2 } });

    const highAppt = await createDirectAppointment({ customerId: customer.userId, mentorProfileId: highRated.mentorProfileId, offeringId: highRated.offeringId, ...pastWindow(48) });
    await prisma.review.create({ data: { appointmentId: highAppt.id, customerId: customer.userId, mentorProfileId: highRated.mentorProfileId, rating: 5 } });

    const res = await request(app).get("/api/mentors?sort=rating");
    const ids = res.body.data.mentors.map((m: { id: string }) => m.id);
    expect(ids.indexOf(highRated.mentorProfileId)).toBeLessThan(ids.indexOf(lowRated.mentorProfileId));
  });

  it("16. sorting does not mutate or persist any mentor data", async () => {
    const mentor = await makeReadyMentor();
    const before = await prisma.mentorProfile.findUniqueOrThrow({ where: { id: mentor.mentorProfileId } });

    await request(app).get("/api/mentors?sort=rating");
    await request(app).get("/api/mentors?sort=sessions");
    await request(app).get("/api/mentors?sort=newest");

    const after = await prisma.mentorProfile.findUniqueOrThrow({ where: { id: mentor.mentorProfileId } });
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
  });

  it("17. exposes no fabricated ranking/recommendation score", async () => {
    const mentor = await makeReadyMentor();
    const res = await request(app).get("/api/mentors");
    const item = res.body.data.mentors.find((m: { id: string }) => m.id === mentor.mentorProfileId);
    expect(item).not.toHaveProperty("score");
    expect(item).not.toHaveProperty("rank");
    expect(item).not.toHaveProperty("relevance");
  });
});

describe("Pagination", () => {
  it("18. defaults to page=1, limit=20", async () => {
    const res = await request(app).get("/api/mentors");
    expect(res.body.data.pagination).toMatchObject({ page: 1, limit: 20 });
  });

  it("19. supports a custom page/limit", async () => {
    for (let i = 0; i < 3; i++) await makeReadyMentor();
    const res = await request(app).get("/api/mentors?page=1&limit=2");
    expect(res.body.data.pagination.limit).toBe(2);
    expect(res.body.data.mentors.length).toBeLessThanOrEqual(2);
  });

  it("20. rejects a limit above 100", async () => {
    const res = await request(app).get("/api/mentors?limit=101");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("21. returns correct pagination metadata", async () => {
    for (let i = 0; i < 3; i++) await makeReadyMentor();
    const res = await request(app).get("/api/mentors?page=1&limit=2");
    const { total, totalPages, page, limit } = res.body.data.pagination;
    expect(page).toBe(1);
    expect(limit).toBe(2);
    expect(total).toBeGreaterThanOrEqual(3);
    expect(totalPages).toBe(Math.ceil(total / limit));
  });
});

describe("Public DTO / privacy", () => {
  it("22. contains the expected public mentor fields", async () => {
    const mentor = await makeReadyMentor();
    const res = await request(app).get("/api/mentors");
    const item = res.body.data.mentors.find((m: { id: string }) => m.id === mentor.mentorProfileId);
    expect(item).toMatchObject({
      id: mentor.mentorProfileId,
      name: "Test Mentor",
      headline: "Senior Engineer",
      primaryCategory: null,
    });
    expect(item.averageRating).toBeNull();
    expect(item.reviewCount).toBe(0);
    expect(typeof item.completedSessionCount).toBe("number");
    expect(Array.isArray(item.offerings)).toBe(true);
  });

  it("23. excludes inactive offerings from a mentor's offering list", async () => {
    const mentor = await makeReadyMentor();
    await request(app).post("/api/mentor/offerings").set("Cookie", mentor.authCookie).send({
      name: "Inactive Offering",
      category: "CAREER_GROWTH",
      durationMinutes: 30,
      price: 50,
      currency: "INR",
      connectionModes: ["GOOGLE_MEET"],
      availabilityCategories: ["EVENING"],
      isActive: false,
    });

    const res = await request(app).get(`/api/mentors/${mentor.mentorProfileId}`);
    const names = res.body.data.mentor.offerings.map((o: { name: string }) => o.name);
    expect(names).toContain("Career Deep Dive");
    expect(names).not.toContain("Inactive Offering");
  });

  it("24. never exposes authentication/internal fields", async () => {
    const mentor = await makeReadyMentor();
    const listRes = await request(app).get("/api/mentors");
    const profileRes = await request(app).get(`/api/mentors/${mentor.mentorProfileId}`);
    for (const body of [listRes.body, profileRes.body]) {
      const json = JSON.stringify(body);
      expect(json).not.toContain("passwordHash");
      expect(json).not.toMatch(/refreshToken|tokenHash/i);
      expect(json).not.toContain("userId");
    }
  });

  it("25. does not expose the mentor's phone number", async () => {
    const mentor = await makeReadyMentor({ phone: "+1-555-7777" });
    const listRes = await request(app).get("/api/mentors");
    const profileRes = await request(app).get(`/api/mentors/${mentor.mentorProfileId}`);
    expect(JSON.stringify(listRes.body)).not.toContain("+1-555-7777");
    expect(JSON.stringify(profileRes.body)).not.toContain("+1-555-7777");
  });
});

describe("Public mentor profile", () => {
  it("26. includes experience entries", async () => {
    const mentor = await makeReadyMentor();
    await request(app).post("/api/mentor/experience").set("Cookie", mentor.authCookie).send({ organization: "Acme Corp", role: "Staff Engineer", startDate: "2020-01-01" });

    const res = await request(app).get(`/api/mentors/${mentor.mentorProfileId}`);
    expect(res.body.data.mentor.experienceEntries).toHaveLength(1);
    expect(res.body.data.mentor.experienceEntries[0]).toMatchObject({ organization: "Acme Corp", role: "Staff Engineer" });
  });

  it("27. includes only active offerings", async () => {
    const mentor = await makeReadyMentor();
    const res = await request(app).get(`/api/mentors/${mentor.mentorProfileId}`);
    expect(res.body.data.mentor.offerings).toHaveLength(1);
    expect(res.body.data.mentor.offerings[0].name).toBe("Career Deep Dive");
  });

  it("28. includes derived rating/review/session stats", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const appt = await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, ...pastWindow(48) });
    await request(app).post(`/api/appointments/${appt.id}/review`).set("Cookie", customer.authCookie).send({ rating: 4 });

    const res = await request(app).get(`/api/mentors/${mentor.mentorProfileId}`);
    expect(res.body.data.mentor.averageRating).toBe(4);
    expect(res.body.data.mentor.reviewCount).toBe(1);
    expect(res.body.data.mentor.completedSessionCount).toBe(1);
  });

  it("29. returns 404 for a nonexistent mentor", async () => {
    const res = await request(app).get("/api/mentors/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("MENTOR_NOT_FOUND");
  });

  it("30. does not expose private availability/onboarding configuration", async () => {
    const mentor = await makeReadyMentor();
    const res = await request(app).get(`/api/mentors/${mentor.mentorProfileId}`);
    const body = res.body.data.mentor;
    expect(body).not.toHaveProperty("minimumNoticeMinutes");
    expect(body).not.toHaveProperty("maximumAdvanceDays");
    expect(body).not.toHaveProperty("onboardingComplete");
    expect(body).not.toHaveProperty("acceptingBookings");
    expect(body).not.toHaveProperty("availabilityRules");
    expect(body).not.toHaveProperty("timezone");
    expect(body).not.toHaveProperty("phone");
  });
});

describe("Stats correctness", () => {
  it("31. a mentor with no reviews returns a null rating, not zero", async () => {
    const mentor = await makeReadyMentor();
    const res = await request(app).get(`/api/mentors/${mentor.mentorProfileId}`);
    expect(res.body.data.mentor.averageRating).toBeNull();
    expect(res.body.data.mentor.reviewCount).toBe(0);
  });

  it("32. review count matches actual Review records", async () => {
    const mentor = await makeReadyMentor();
    const customerA = await registerCustomerAndGetAuthCookie();
    const customerB = await registerCustomerAndGetAuthCookie();
    const apptA = await createDirectAppointment({ customerId: customerA.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, ...pastWindow(72) });
    const apptB = await createDirectAppointment({ customerId: customerB.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, ...pastWindow(48) });
    await request(app).post(`/api/appointments/${apptA.id}/review`).set("Cookie", customerA.authCookie).send({ rating: 3 });
    await request(app).post(`/api/appointments/${apptB.id}/review`).set("Cookie", customerB.authCookie).send({ rating: 5 });

    const res = await request(app).get(`/api/mentors/${mentor.mentorProfileId}`);
    expect(res.body.data.mentor.reviewCount).toBe(2);
    expect(res.body.data.mentor.averageRating).toBe(4);
  });

  it("33. completed session count excludes cancelled appointments", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, ...pastWindow(48), status: "CANCELLED" });

    const res = await request(app).get(`/api/mentors/${mentor.mentorProfileId}`);
    expect(res.body.data.mentor.completedSessionCount).toBe(0);
  });

  it("34. respects effective completion (a future confirmed appointment doesn't count yet)", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));

    const res = await request(app).get(`/api/mentors/${mentor.mentorProfileId}`);
    expect(res.body.data.mentor.completedSessionCount).toBe(0);
  });
});

describe("Availability integration", () => {
  it("36. existing availability endpoint behavior is unchanged by Phase 7", async () => {
    const mentor = await makeReadyMentor();
    const date = nextDateForIsoDayOfWeek(1, 7);
    const res = await request(app).get(`/api/mentors/${mentor.mentorProfileId}/availability?offeringId=${mentor.offeringId}&date=${date}`);
    expect(res.status).toBe(200);
    // makeReadyMentor's default rule is 18:00-20:00 with a 45-minute
    // offering: 18:00-18:45, 18:45-19:30 fit; 19:30-20:15 would exceed 20:00.
    expect(res.body.data.slots.map((s: { startAt: string }) => s.startAt)).toEqual([
      `${date}T18:00:00.000Z`,
      `${date}T18:45:00.000Z`,
    ]);
  });
});
