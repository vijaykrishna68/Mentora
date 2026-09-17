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

describe("GET /api/mentor/appointments — authorization", () => {
  it("1. rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/mentor/appointments");
    expect(res.status).toBe(401);
  });

  it("2. rejects a customer", async () => {
    const customer = await registerCustomerAndGetAuthCookie();
    const res = await request(app).get("/api/mentor/appointments").set("Cookie", customer.authCookie);
    expect(res.status).toBe(403);
  });

  it("3. allows a mentor", async () => {
    const mentor = await makeReadyMentor();
    const res = await request(app).get("/api/mentor/appointments").set("Cookie", mentor.authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("upcoming");
    expect(res.body.data).toHaveProperty("past");
  });

  it("4. a mentor never sees another mentor's appointments", async () => {
    const mentorA = await makeReadyMentor();
    const mentorB = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    await bookSlot(customer.authCookie, mentorA.mentorProfileId, mentorA.offeringId, mondayAt("18:00"));

    const res = await request(app).get("/api/mentor/appointments").set("Cookie", mentorB.authCookie);
    expect(res.body.data.upcoming).toHaveLength(0);
    expect(res.body.data.past).toHaveLength(0);
  });

  it("5. a client-supplied mentorId query param is not an ownership mechanism", async () => {
    const mentorA = await makeReadyMentor();
    const mentorB = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    await bookSlot(customer.authCookie, mentorA.mentorProfileId, mentorA.offeringId, mondayAt("18:00"));

    // Even if mentor B tries to pass mentor A's id as a query param, they
    // still only ever see their own (empty) list — ownership always comes
    // from req.user, never from client input.
    const res = await request(app)
      .get(`/api/mentor/appointments?mentorId=${mentorA.mentorProfileId}`)
      .set("Cookie", mentorB.authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.upcoming).toHaveLength(0);
    expect(res.body.data.past).toHaveLength(0);
  });

  it("13. an empty appointment list works correctly", async () => {
    const mentor = await makeReadyMentor();
    const res = await request(app).get("/api/mentor/appointments").set("Cookie", mentor.authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.upcoming).toEqual([]);
    expect(res.body.data.past).toEqual([]);
  });
});

describe("GET /api/mentor/appointments — classification and sorting", () => {
  it("5b. upcoming appointments are sorted ascending by startAt", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const later = mondayAt("18:00", 14);
    const sooner = mondayAt("18:00", 7);
    await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, later);
    await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, sooner);

    const res = await request(app).get("/api/mentor/appointments").set("Cookie", mentor.authCookie);
    expect(res.body.data.upcoming.map((a: { startAt: string }) => a.startAt)).toEqual([sooner, later]);
  });

  it("6. past appointments are sorted descending by startAt", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const older = await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, ...pastWindow(72) });
    const newer = await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, ...pastWindow(48) });

    const res = await request(app).get("/api/mentor/appointments").set("Cookie", mentor.authCookie);
    const ids = res.body.data.past.map((a: { id: string }) => a.id);
    expect(ids).toEqual([newer.id, older.id]);
  });

  it("7. effective completion is respected without mutating the persisted status", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const appointment = await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, ...pastWindow(48) });

    const res = await request(app).get("/api/mentor/appointments").set("Cookie", mentor.authCookie);
    expect(res.body.data.upcoming).toHaveLength(0);
    expect(res.body.data.past).toHaveLength(1);
    expect(res.body.data.past[0].status).toBe("COMPLETED");

    const stored = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
    expect(stored.status).toBe("CONFIRMED");
  });

  it("8. cancelled appointments are represented correctly", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const booked = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));
    await request(app).patch(`/api/appointments/${booked.body.data.appointment.id}/cancel`).set("Cookie", customer.authCookie);

    const res = await request(app).get("/api/mentor/appointments").set("Cookie", mentor.authCookie);
    expect(res.body.data.upcoming).toHaveLength(0);
    expect(res.body.data.past).toHaveLength(1);
    expect(res.body.data.past[0].status).toBe("CANCELLED");
  });
});

describe("GET /api/mentor/appointments — historical snapshots", () => {
  it("9, 10, 11. preserves offeringSnapshot, mentorTimezone, and connectionDetail after later mentor/offering changes", async () => {
    const mentor = await makeReadyMentor({ timezone: "Asia/Kolkata", phone: "+1-555-0001" });
    const customer = await registerCustomerAndGetAuthCookie();
    const startAt = mondayAt("12:30");
    const booked = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, startAt, "PHONE");
    expect(booked.status).toBe(201);

    // Change everything the snapshot is supposed to protect against.
    await request(app).patch(`/api/mentor/offerings/${mentor.offeringId}`).set("Cookie", mentor.authCookie).send({ name: "Renamed", price: 999, durationMinutes: 90 });
    await request(app).patch("/api/mentor/profile").set("Cookie", mentor.authCookie).send({ timezone: "America/New_York", phone: "+1-555-9999" });

    const res = await request(app).get("/api/mentor/appointments").set("Cookie", mentor.authCookie);
    const appointment = res.body.data.upcoming[0];
    expect(appointment.offeringSnapshot).toEqual({ name: "Career Deep Dive", durationMinutes: 45, price: 400, currency: "INR" });
    expect(appointment.mentorTimezone).toBe("Asia/Kolkata");
    expect(appointment.connectionDetail).toBe("+1-555-0001");
  });

  it("also preserves the snapshot after the offering is archived", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const booked = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));

    await request(app).delete(`/api/mentor/offerings/${mentor.offeringId}`).set("Cookie", mentor.authCookie);

    const res = await request(app).get("/api/mentor/appointments").set("Cookie", mentor.authCookie);
    expect(res.body.data.upcoming[0].id).toBe(booked.body.data.appointment.id);
    expect(res.body.data.upcoming[0].offeringSnapshot).toEqual({ name: "Career Deep Dive", durationMinutes: 45, price: 400, currency: "INR" });
  });
});

describe("GET /api/mentor/appointments — privacy and DTO shape", () => {
  it("12. never leaks passwordHash, refresh tokens, or auth internals", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));

    const res = await request(app).get("/api/mentor/appointments").set("Cookie", mentor.authCookie);
    const json = JSON.stringify(res.body);
    expect(json).not.toContain("passwordHash");
    expect(json).not.toMatch(/refreshToken|tokenHash/i);
  });

  it("includes a small customer identity (id, name) and no other customer fields", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));

    const res = await request(app).get("/api/mentor/appointments").set("Cookie", mentor.authCookie);
    const appointment = res.body.data.upcoming[0];
    expect(appointment.customer).toEqual({ id: customer.userId, name: "Test Customer" });
  });

  it("review information is included for a reviewed completed appointment", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const appointment = await createDirectAppointment({ customerId: customer.userId, mentorProfileId: mentor.mentorProfileId, offeringId: mentor.offeringId, ...pastWindow(48) });
    await request(app).post(`/api/appointments/${appointment.id}/review`).set("Cookie", customer.authCookie).send({ rating: 5, comment: "Great!" });

    const res = await request(app).get("/api/mentor/appointments").set("Cookie", mentor.authCookie);
    expect(res.body.data.past[0].review).toMatchObject({ rating: 5, comment: "Great!" });
  });
});

describe("Regression: existing customer appointments behavior is unchanged", () => {
  it("14. GET /api/appointments (customer) still works exactly as before", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));

    const res = await request(app).get("/api/appointments").set("Cookie", customer.authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.upcoming).toHaveLength(1);
    expect(res.body.data.upcoming[0].mentor).toMatchObject({ id: mentor.mentorProfileId, name: "Test Mentor" });
  });
});
