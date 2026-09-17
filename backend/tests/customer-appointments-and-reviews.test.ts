import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { getMentorRatingSummary, getMentorCompletedSessionCount } from "../src/modules/mentor/mentor-rating.js";
import { makeReadyMentor, registerMentorAndGetAuthCookie, registerCustomerAndGetAuthCookie, nextDateForIsoDayOfWeek } from "./helpers.js";

function mondayAt(time: string, minDaysAhead = 7): string {
  const date = nextDateForIsoDayOfWeek(1, minDaysAhead);
  return `${date}T${time}:00.000Z`;
}

async function bookSlot(authCookie: string, mentorId: string, offeringId: string, startAt: string, connectionMode = "GOOGLE_MEET") {
  return request(app).post("/api/appointments").set("Cookie", authCookie).send({ mentorId, offeringId, startAt, connectionMode });
}

/** Creates a CONFIRMED appointment directly via Prisma, with startAt/endAt fully controlled (bypasses booking's own future/notice constraints). */
async function createDirectAppointment(params: {
  customerId: string;
  mentorProfileId: string;
  offeringId: string;
  startAt: Date;
  endAt: Date;
  status?: "CONFIRMED" | "CANCELLED";
  mentorTimezone?: string;
  connectionMode?: string;
  connectionDetail?: string | null;
}) {
  return prisma.appointment.create({
    data: {
      customerId: params.customerId,
      mentorProfileId: params.mentorProfileId,
      offeringId: params.offeringId,
      startAt: params.startAt,
      endAt: params.endAt,
      status: params.status ?? "CONFIRMED",
      connectionMode: (params.connectionMode as never) ?? "GOOGLE_MEET",
      connectionDetail: params.connectionDetail ?? null,
      mentorTimezone: params.mentorTimezone ?? "UTC",
      offeringSnapshot: { name: "Career Deep Dive", durationMinutes: 45, price: 400, currency: "INR" },
    },
  });
}

function pastWindow(hoursAgo: number, durationMinutes = 45) {
  const startAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
  return { startAt, endAt };
}

describe("GET /api/appointments", () => {
  it("1. lets a customer retrieve their own appointments", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));

    const res = await request(app).get("/api/appointments").set("Cookie", customer.authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.upcoming).toHaveLength(1);
    expect(res.body.data.upcoming[0].mentor.name).toBe("Test Mentor");
  });

  it("2. never returns another customer's appointments", async () => {
    const mentor = await makeReadyMentor();
    const customerA = await registerCustomerAndGetAuthCookie();
    const customerB = await registerCustomerAndGetAuthCookie();
    await bookSlot(customerA.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));

    const res = await request(app).get("/api/appointments").set("Cookie", customerB.authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.upcoming).toHaveLength(0);
    expect(res.body.data.past).toHaveLength(0);
  });

  it("3. rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/appointments");
    expect(res.status).toBe(401);
  });

  it("4. rejects a mentor", async () => {
    const mentor = await registerMentorAndGetAuthCookie();
    const res = await request(app).get("/api/appointments").set("Cookie", mentor.authCookie);
    expect(res.status).toBe(403);
  });

  it("5. classifies a future confirmed appointment as upcoming", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));

    const res = await request(app).get("/api/appointments").set("Cookie", customer.authCookie);
    expect(res.body.data.upcoming).toHaveLength(1);
    expect(res.body.data.upcoming[0].status).toBe("CONFIRMED");
    expect(res.body.data.past).toHaveLength(0);
  });

  it("6. classifies a past (effectively completed) appointment as past", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const { startAt, endAt } = pastWindow(48);
    await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, startAt, endAt });

    const res = await request(app).get("/api/appointments").set("Cookie", customer.authCookie);
    expect(res.body.data.upcoming).toHaveLength(0);
    expect(res.body.data.past).toHaveLength(1);
    expect(res.body.data.past[0].status).toBe("COMPLETED");
  });

  it("7. reflects effective completion without mutating the persisted status", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const { startAt, endAt } = pastWindow(48);
    const appointment = await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, startAt, endAt });

    const res = await request(app).get("/api/appointments").set("Cookie", customer.authCookie);
    expect(res.body.data.past[0].status).toBe("COMPLETED");

    const stored = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
    expect(stored.status).toBe("CONFIRMED");
  });

  it("8. keeps cancelled appointments visible with CANCELLED status", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const booked = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));
    await request(app).patch(`/api/appointments/${booked.body.data.appointment.id}/cancel`).set("Cookie", customer.authCookie);

    const res = await request(app).get("/api/appointments").set("Cookie", customer.authCookie);
    expect(res.body.data.upcoming).toHaveLength(0);
    expect(res.body.data.past).toHaveLength(1);
    expect(res.body.data.past[0].status).toBe("CANCELLED");
  });

  it("9. returns the historical offering snapshot even after the offering changes", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const booked = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));

    await request(app).patch(`/api/mentor/offerings/${mentor.offeringId}`).set("Cookie", mentor.authCookie).send({ name: "Renamed", price: 999 });

    const res = await request(app).get("/api/appointments").set("Cookie", customer.authCookie);
    expect(res.body.data.upcoming[0].offeringSnapshot).toEqual({ name: "Career Deep Dive", durationMinutes: 45, price: 400, currency: "INR" });
    void booked;
  });

  it("10. preserves the mentor timezone snapshot even after the mentor changes their timezone", async () => {
    const mentor = await makeReadyMentor({ timezone: "Asia/Kolkata" });
    const customer = await registerCustomerAndGetAuthCookie();
    await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("12:30"));

    await request(app).patch("/api/mentor/profile").set("Cookie", mentor.authCookie).send({ timezone: "America/New_York" });

    const res = await request(app).get("/api/appointments").set("Cookie", customer.authCookie);
    expect(res.body.data.upcoming[0].mentorTimezone).toBe("Asia/Kolkata");
  });

  it("11. preserves the connection detail snapshot even after the mentor changes their phone number", async () => {
    const mentor = await makeReadyMentor({ phone: "+1-555-0001" });
    const customer = await registerCustomerAndGetAuthCookie();
    await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"), "PHONE");

    await request(app).patch("/api/mentor/profile").set("Cookie", mentor.authCookie).send({ phone: "+1-555-9999" });

    const res = await request(app).get("/api/appointments").set("Cookie", customer.authCookie);
    expect(res.body.data.upcoming[0].connectionDetail).toBe("+1-555-0001");
  });
});

describe("POST /api/appointments/:id/review", () => {
  it("12. lets a customer review a completed appointment", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const { startAt, endAt } = pastWindow(48);
    const appointment = await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, startAt, endAt });

    const res = await request(app).post(`/api/appointments/${appointment.id}/review`).set("Cookie", customer.authCookie).send({ rating: 5, comment: "Great session." });
    expect(res.status).toBe(201);
    expect(res.body.data.review).toMatchObject({ rating: 5, comment: "Great session." });
    expect(res.body.data.review.customer.displayName).toBe("Test Customer");
  });

  it("13. rejects reviewing a future appointment", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const booked = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));

    const res = await request(app).post(`/api/appointments/${booked.body.data.appointment.id}/review`).set("Cookie", customer.authCookie).send({ rating: 5 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("APPOINTMENT_NOT_COMPLETED");
  });

  it("14. rejects reviewing a cancelled appointment", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const booked = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));
    await request(app).patch(`/api/appointments/${booked.body.data.appointment.id}/cancel`).set("Cookie", customer.authCookie);

    const res = await request(app).post(`/api/appointments/${booked.body.data.appointment.id}/review`).set("Cookie", customer.authCookie).send({ rating: 5 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("APPOINTMENT_CANCELLED");
  });

  it("15. rejects reviewing another customer's appointment", async () => {
    const mentor = await makeReadyMentor();
    const customerA = await registerCustomerAndGetAuthCookie();
    const customerB = await registerCustomerAndGetAuthCookie();
    const { startAt, endAt } = pastWindow(48);
    const appointment = await createDirectAppointment({ customerId: customerA.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, startAt, endAt });

    const res = await request(app).post(`/api/appointments/${appointment.id}/review`).set("Cookie", customerB.authCookie).send({ rating: 5 });
    expect(res.status).toBe(403);
  });

  it("16. rejects a mentor creating a review", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const { startAt, endAt } = pastWindow(48);
    const appointment = await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, startAt, endAt });

    const otherMentor = await registerMentorAndGetAuthCookie();
    const res = await request(app).post(`/api/appointments/${appointment.id}/review`).set("Cookie", otherMentor.authCookie).send({ rating: 5 });
    expect(res.status).toBe(403);
  });

  it("17-19. rejects invalid ratings (below 1, above 5, non-integer)", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();

    const ratings = [0, 6, 4.5];
    for (let i = 0; i < ratings.length; i++) {
      const rating = ratings[i]!;
      // Stagger by several hours per iteration so these don't overlap each
      // other on the same mentor (the exclusion constraint would reject that).
      const { startAt, endAt } = pastWindow(48 + i * 3);
      const appointment = await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, startAt, endAt });
      const res = await request(app).post(`/api/appointments/${appointment.id}/review`).set("Cookie", customer.authCookie).send({ rating });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("20. rejects an overlong comment", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const { startAt, endAt } = pastWindow(48);
    const appointment = await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, startAt, endAt });

    const res = await request(app).post(`/api/appointments/${appointment.id}/review`).set("Cookie", customer.authCookie).send({ rating: 5, comment: "x".repeat(2001) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("also rejects mentorId/customerId/appointmentId/createdAt in the request body", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const { startAt, endAt } = pastWindow(48);
    const appointment = await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, startAt, endAt });

    const res = await request(app)
      .post(`/api/appointments/${appointment.id}/review`)
      .set("Cookie", customer.authCookie)
      .send({ rating: 5, mentorId: "x", customerId: "y", appointmentId: "z", createdAt: "2020-01-01" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("21. rejects a duplicate review on the same appointment", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const { startAt, endAt } = pastWindow(48);
    const appointment = await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, startAt, endAt });

    const first = await request(app).post(`/api/appointments/${appointment.id}/review`).set("Cookie", customer.authCookie).send({ rating: 5 });
    expect(first.status).toBe(201);

    const second = await request(app).post(`/api/appointments/${appointment.id}/review`).set("Cookie", customer.authCookie).send({ rating: 3 });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("REVIEW_ALREADY_EXISTS");
  });

  it("22. the database unique constraint protects concurrent duplicate review attempts (real PostgreSQL)", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const { startAt, endAt } = pastWindow(48);
    const appointment = await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, startAt, endAt });

    const [resA, resB] = await Promise.all([
      request(app).post(`/api/appointments/${appointment.id}/review`).set("Cookie", customer.authCookie).send({ rating: 5 }),
      request(app).post(`/api/appointments/${appointment.id}/review`).set("Cookie", customer.authCookie).send({ rating: 3 }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const reviewCount = await prisma.review.count({ where: { appointmentId: appointment.id } });
    expect(reviewCount).toBe(1);
  });
});

describe("Mentor rating and session-count derivation", () => {
  it("23. derives average rating and review count correctly from Review rows", async () => {
    const mentor = await makeReadyMentor();
    const customerA = await registerCustomerAndGetAuthCookie();
    const customerB = await registerCustomerAndGetAuthCookie();

    const appt1 = await createDirectAppointment({ customerId: customerA.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, ...pastWindow(72) });
    const appt2 = await createDirectAppointment({ customerId: customerB.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, ...pastWindow(48) });
    await request(app).post(`/api/appointments/${appt1.id}/review`).set("Cookie", customerA.authCookie).send({ rating: 4 });
    await request(app).post(`/api/appointments/${appt2.id}/review`).set("Cookie", customerB.authCookie).send({ rating: 5 });

    const summary = await getMentorRatingSummary(mentor.mentorProfileId);
    expect(summary.reviewCount).toBe(2);
    expect(summary.averageRating).toBe(4.5);
  });

  it("24. a mentor with no reviews returns a null rating, not zero", async () => {
    const mentor = await makeReadyMentor();
    const summary = await getMentorRatingSummary(mentor.mentorProfileId);
    expect(summary.reviewCount).toBe(0);
    expect(summary.averageRating).toBeNull();
  });

  it("25. session count only counts effectively completed appointments", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();

    await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, ...pastWindow(72) });
    await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, ...pastWindow(48) });
    // Not completed yet (future).
    await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));

    const count = await getMentorCompletedSessionCount(mentor.mentorProfileId);
    expect(count).toBe(2);
  });

  it("26. cancelled appointments are never counted as completed sessions", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();

    // A cancelled appointment whose time has already passed — must still not count.
    await createDirectAppointment({
      customerId: customer.userId,
      mentorProfileId: mentor.mentorProfileId,
      offeringId: mentor.offeringId,
      ...pastWindow(48),
      status: "CANCELLED",
    });

    const count = await getMentorCompletedSessionCount(mentor.mentorProfileId);
    expect(count).toBe(0);
  });
});
