import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import {
  makeReadyMentor,
  registerMentorAndGetAuthCookie,
  registerCustomerAndGetAuthCookie,
  nextDateForIsoDayOfWeek,
} from "./helpers.js";

// Mentor's rule (UTC, MONDAY, 18:00-20:00, 45min offering, 15min buffer)
// yields candidates 18:00, 18:45, 19:30.
function mondayAt(time: string, minDaysAhead = 7): string {
  const date = nextDateForIsoDayOfWeek(1, minDaysAhead);
  return `${date}T${time}:00.000Z`;
}

async function bookSlot(authCookie: string, mentorId: string, offeringId: string, startAt: string, connectionMode = "GOOGLE_MEET") {
  return request(app)
    .post("/api/appointments")
    .set("Cookie", authCookie)
    .send({ mentorId, offeringId, startAt, connectionMode });
}

describe("POST /api/appointments — booking", () => {
  it("1. lets a customer book a valid slot", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();

    const res = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));
    expect(res.status).toBe(201);
    expect(res.body.data.appointment).toMatchObject({
      mentorId: mentor.mentorProfileId,
      offeringId: mentor.offeringId,
      status: "CONFIRMED",
      connectionMode: "GOOGLE_MEET",
    });
    // v1 never generates a Meet link — connectionDetail is only ever
    // populated for PHONE bookings (see the next test).
    expect(res.body.data.appointment.connectionDetail).toBeNull();
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("1b. a PHONE booking snapshots the mentor's phone number as connectionDetail", async () => {
    const mentor = await makeReadyMentor({ phone: "+1-555-0199" });
    const customer = await registerCustomerAndGetAuthCookie();

    const res = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"), "PHONE");
    expect(res.status).toBe(201);
    expect(res.body.data.appointment.connectionMode).toBe("PHONE");
    expect(res.body.data.appointment.connectionDetail).toBe("+1-555-0199");
  });

  it("2. rejects a mentor trying to book", async () => {
    const mentor = await makeReadyMentor();
    const otherMentor = await registerMentorAndGetAuthCookie();

    const res = await bookSlot(otherMentor.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));
    expect(res.status).toBe(403);
  });

  it("3. rejects an unauthenticated request", async () => {
    const mentor = await makeReadyMentor();
    const res = await request(app)
      .post("/api/appointments")
      .send({ mentorId: mentor.mentorProfileId, offeringId: mentor.offeringId, startAt: mondayAt("18:00"), connectionMode: "GOOGLE_MEET" });
    expect(res.status).toBe(401);
  });

  it("4. rejects an unknown mentor", async () => {
    const customer = await registerCustomerAndGetAuthCookie();
    const res = await bookSlot(customer.authCookie, "00000000-0000-0000-0000-000000000000", "00000000-0000-0000-0000-000000000000", mondayAt("18:00"));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("MENTOR_NOT_FOUND");
  });

  it("5. rejects an offering belonging to another mentor", async () => {
    const mentorA = await makeReadyMentor();
    const mentorB = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();

    const res = await bookSlot(customer.authCookie, mentorA.mentorProfileId, mentorB.offeringId, mondayAt("18:00"));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("OFFERING_NOT_FOUND");
  });

  it("6. rejects an inactive offering", async () => {
    const mentor = await makeReadyMentor();
    // Second active offering keeps the mentor bookable overall.
    await request(app).post("/api/mentor/offerings").set("Cookie", mentor.authCookie).send({
      name: "Second Offering",
      category: "CAREER_GROWTH",
      durationMinutes: 45,
      price: 100,
      currency: "INR",
      connectionModes: ["GOOGLE_MEET"],
      availabilityCategories: ["EVENING"],
    });
    await request(app).patch(`/api/mentor/offerings/${mentor.offeringId}`).set("Cookie", mentor.authCookie).send({ isActive: false });

    const customer = await registerCustomerAndGetAuthCookie();
    const res = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("OFFERING_INACTIVE");
  });

  it("7. rejects a mentor who is not accepting bookings", async () => {
    const mentor = await makeReadyMentor();
    await request(app).patch("/api/mentor/profile").set("Cookie", mentor.authCookie).send({ acceptingBookings: false });

    const customer = await registerCustomerAndGetAuthCookie();
    const res = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("MENTOR_NOT_ACCEPTING_BOOKINGS");
  });

  it("8. rejects an incomplete mentor (onboardingComplete=false, even if acceptingBookings is still true)", async () => {
    const mentor = await makeReadyMentor();
    // Removing the only active offering flips onboardingComplete back to
    // false without touching acceptingBookings itself (Phase 3 behavior) —
    // isolates the "incomplete" check from the "not accepting" check.
    await request(app).patch(`/api/mentor/offerings/${mentor.offeringId}`).set("Cookie", mentor.authCookie).send({ isActive: false });

    const stillAccepting = await prisma.mentorProfile.findUniqueOrThrow({ where: { id: mentor.mentorProfileId } });
    expect(stillAccepting.acceptingBookings).toBe(true);
    expect(stillAccepting.onboardingComplete).toBe(false);

    const customer = await registerCustomerAndGetAuthCookie();
    const res = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("MENTOR_NOT_READY");
  });

  it("9. rejects an invalid connection mode value", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const res = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"), "CARRIER_PIGEON");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("10. connection mode must be supported by both the offering and the mentor", async () => {
    const mentor = await makeReadyMentor({ connectionModes: ["GOOGLE_MEET"], offeringConnectionModes: ["GOOGLE_MEET"] });
    const customer = await registerCustomerAndGetAuthCookie();

    const offeringDoesNotSupport = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"), "PHONE");
    expect(offeringDoesNotSupport.status).toBe(400);
    expect(offeringDoesNotSupport.body.error.code).toBe("UNSUPPORTED_CONNECTION_MODE");

    // Offering claims to support PHONE, but the mentor's own profile doesn't.
    await request(app).patch(`/api/mentor/offerings/${mentor.offeringId}`).set("Cookie", mentor.authCookie).send({ connectionModes: ["GOOGLE_MEET", "PHONE"] });
    const mentorDoesNotSupport = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"), "PHONE");
    expect(mentorDoesNotSupport.status).toBe(400);
    expect(mentorDoesNotSupport.body.error.code).toBe("UNSUPPORTED_CONNECTION_MODE");
  });

  it("11. rejects a malformed startAt", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const res = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, "not-a-date");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("12. rejects a startAt outside the availability window", async () => {
    const mentor = await makeReadyMentor(); // window is 18:00-20:00
    const customer = await registerCustomerAndGetAuthCookie();
    const res = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("06:00"));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_SLOT");
  });

  it("13. rejects a startAt whose derived category the offering doesn't allow", async () => {
    const mentor = await makeReadyMentor({ availabilityCategories: ["EVENING"] });
    // Add a second, MORNING-window rule the offering isn't allowed to use.
    await request(app).post("/api/mentor/availability").set("Cookie", mentor.authCookie).send({
      dayOfWeek: "MONDAY",
      startTime: "09:00",
      endTime: "10:00",
      bufferMinutes: 0,
    });
    const customer = await registerCustomerAndGetAuthCookie();
    const res = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("09:00"));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_SLOT");
  });

  it("14. enforces minimum notice", async () => {
    const mentor = await makeReadyMentor({ minimumNoticeMinutes: 48 * 60, dayOfWeek: "MONDAY" });
    const customer = await registerCustomerAndGetAuthCookie();
    // Next Monday is at least 7 days out, which normally clears 48h notice —
    // shrink the horizon by requesting the very next occurrence (>=0 days).
    const soonMonday = nextDateForIsoDayOfWeek(1, 0);
    const res = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, `${soonMonday}T18:00:00.000Z`);
    // If "soon" Monday already satisfies 48h notice this assertion would be
    // wrong, so guard: only meaningful when that date is under 48h away.
    const hoursAway = (new Date(`${soonMonday}T18:00:00.000Z`).getTime() - Date.now()) / (60 * 60 * 1000);
    if (hoursAway < 48) {
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_SLOT");
    } else {
      expect(res.status).toBe(201);
    }
  });

  it("15. enforces maximum advance", async () => {
    const mentor = await makeReadyMentor({ maximumAdvanceDays: 1 });
    const customer = await registerCustomerAndGetAuthCookie();
    // 7+ days out is well beyond a 1-day advance window.
    const res = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_SLOT");
  });

  it("16. rejects a past slot", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const pastMonday = nextDateForIsoDayOfWeek(1, -14);
    const res = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, `${pastMonday}T18:00:00.000Z`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_SLOT");
  });

  it("17 & 18. endAt is derived from the offering's authoritative duration, never the client", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const startAt = mondayAt("18:00");

    const res = await request(app)
      .post("/api/appointments")
      .set("Cookie", customer.authCookie)
      .send({ mentorId: mentor.mentorProfileId, offeringId: mentor.offeringId, startAt, connectionMode: "GOOGLE_MEET", duration: 999 });
    // duration isn't an accepted field at all — rejected outright.
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");

    const validRes = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, startAt);
    expect(validRes.status).toBe(201);
    const expectedEnd = new Date(new Date(startAt).getTime() + 45 * 60 * 1000).toISOString();
    expect(new Date(validRes.body.data.appointment.endAt).toISOString()).toBe(expectedEnd);
  });

  it("19. client cannot manipulate price", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const res = await request(app)
      .post("/api/appointments")
      .set("Cookie", customer.authCookie)
      .send({ mentorId: mentor.mentorProfileId, offeringId: mentor.offeringId, startAt: mondayAt("18:00"), connectionMode: "GOOGLE_MEET", price: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("20 & 21. stores an offering snapshot that survives later offering changes", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();

    const res = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));
    expect(res.status).toBe(201);
    expect(res.body.data.appointment.offeringSnapshot).toEqual({
      name: "Career Deep Dive",
      durationMinutes: 45,
      price: 400,
      currency: "INR",
    });

    await request(app)
      .patch(`/api/mentor/offerings/${mentor.offeringId}`)
      .set("Cookie", mentor.authCookie)
      .send({ name: "Renamed Offering", price: 999 });

    const stored = await prisma.appointment.findUniqueOrThrow({ where: { id: res.body.data.appointment.id } });
    expect(stored.offeringSnapshot).toEqual({ name: "Career Deep Dive", durationMinutes: 45, price: 400, currency: "INR" });
  });

  it("22. an existing confirmed appointment prevents a conflicting booking", async () => {
    const mentor = await makeReadyMentor();
    const customer1 = await registerCustomerAndGetAuthCookie();
    const customer2 = await registerCustomerAndGetAuthCookie();
    const startAt = mondayAt("18:00");

    const first = await bookSlot(customer1.authCookie, mentor.mentorProfileId, mentor.offeringId, startAt);
    expect(first.status).toBe(201);

    const second = await bookSlot(customer2.authCookie, mentor.mentorProfileId, mentor.offeringId, startAt);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("SLOT_UNAVAILABLE");
  });

  it("23. a cancelled appointment does not block rebooking the same slot", async () => {
    const mentor = await makeReadyMentor();
    const customer1 = await registerCustomerAndGetAuthCookie();
    const customer2 = await registerCustomerAndGetAuthCookie();
    const startAt = mondayAt("18:00");

    const first = await bookSlot(customer1.authCookie, mentor.mentorProfileId, mentor.offeringId, startAt);
    expect(first.status).toBe(201);

    const cancelRes = await request(app)
      .patch(`/api/appointments/${first.body.data.appointment.id}/cancel`)
      .set("Cookie", customer1.authCookie);
    expect(cancelRes.status).toBe(200);

    const rebooked = await bookSlot(customer2.authCookie, mentor.mentorProfileId, mentor.offeringId, startAt);
    expect(rebooked.status).toBe(201);
  });
});

describe("POST /api/appointments — concurrency (real PostgreSQL)", () => {
  it("24. two simultaneous identical booking attempts yield exactly one 201 and one 409 SLOT_UNAVAILABLE", async () => {
    const mentor = await makeReadyMentor();
    const customer1 = await registerCustomerAndGetAuthCookie();
    const customer2 = await registerCustomerAndGetAuthCookie();
    const startAt = mondayAt("18:00");

    const [resA, resB] = await Promise.all([
      bookSlot(customer1.authCookie, mentor.mentorProfileId, mentor.offeringId, startAt),
      bookSlot(customer2.authCookie, mentor.mentorProfileId, mentor.offeringId, startAt),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const failed = resA.status === 409 ? resA : resB;
    expect(failed.body.error.code).toBe("SLOT_UNAVAILABLE");

    const confirmedCount = await prisma.appointment.count({
      where: { mentorProfileId: mentor.mentorProfileId, startAt: new Date(startAt), status: "CONFIRMED" },
    });
    expect(confirmedCount).toBe(1);
  });
});

describe("PATCH /api/appointments/:id/cancel", () => {
  it("25. lets a customer cancel their own confirmed appointment", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const booked = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));

    const res = await request(app).patch(`/api/appointments/${booked.body.data.appointment.id}/cancel`).set("Cookie", customer.authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.appointment.status).toBe("CANCELLED");
  });

  it("26. rejects cancelling another customer's appointment", async () => {
    const mentor = await makeReadyMentor();
    const customerA = await registerCustomerAndGetAuthCookie();
    const customerB = await registerCustomerAndGetAuthCookie();
    const booked = await bookSlot(customerA.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));

    const res = await request(app).patch(`/api/appointments/${booked.body.data.appointment.id}/cancel`).set("Cookie", customerB.authCookie);
    expect(res.status).toBe(403);
  });

  it("27. succeeds before the 24h deadline", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    // mondayAt(..., 7) is at least 7 days out — comfortably before the deadline.
    const booked = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));
    const res = await request(app).patch(`/api/appointments/${booked.body.data.appointment.id}/cancel`).set("Cookie", customer.authCookie);
    expect(res.status).toBe(200);
  });

  it("28. fails at/after the 24h deadline", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    // Directly create an appointment starting in 1 hour — bypasses booking's
    // own minimum-notice validation, which would otherwise block us from
    // constructing this scenario through the API.
    const startAt = new Date(Date.now() + 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 45 * 60 * 1000);
    const appointment = await prisma.appointment.create({
      data: {
        customerId: customer.userId,
        mentorProfileId: mentor.mentorProfileId,
        offeringId: mentor.offeringId,
        startAt,
        endAt,
        status: "CONFIRMED",
        connectionMode: "GOOGLE_MEET",
        mentorTimezone: "UTC",
        offeringSnapshot: { name: "Career Deep Dive", durationMinutes: 45, price: 400, currency: "INR" },
      },
    });

    const res = await request(app).patch(`/api/appointments/${appointment.id}/cancel`).set("Cookie", customer.authCookie);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CANCELLATION_DEADLINE_PASSED");
  });

  it("29. a cancelled appointment remains in the database", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const booked = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));
    await request(app).patch(`/api/appointments/${booked.body.data.appointment.id}/cancel`).set("Cookie", customer.authCookie);

    const stillThere = await prisma.appointment.findUnique({ where: { id: booked.body.data.appointment.id } });
    expect(stillThere).not.toBeNull();
    expect(stillThere?.status).toBe("CANCELLED");
  });

  it("30. a cancelled appointment no longer blocks availability", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const startAt = mondayAt("18:00");
    const booked = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, startAt);
    await request(app).patch(`/api/appointments/${booked.body.data.appointment.id}/cancel`).set("Cookie", customer.authCookie);

    const date = startAt.slice(0, 10);
    const availabilityRes = await request(app).get(
      `/api/mentors/${mentor.mentorProfileId}/availability?offeringId=${mentor.offeringId}&date=${date}`,
    );
    expect(availabilityRes.body.data.slots.some((s: { startAt: string }) => s.startAt === startAt)).toBe(true);
  });

  it("31. cannot cancel an already-cancelled appointment", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const booked = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, mondayAt("18:00"));
    await request(app).patch(`/api/appointments/${booked.body.data.appointment.id}/cancel`).set("Cookie", customer.authCookie);

    const secondCancel = await request(app).patch(`/api/appointments/${booked.body.data.appointment.id}/cancel`).set("Cookie", customer.authCookie);
    expect(secondCancel.status).toBe(409);
    expect(secondCancel.body.error.code).toBe("APPOINTMENT_ALREADY_CANCELLED");
  });

  it("32. cannot cancel an effectively-completed appointment", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const startAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 45 * 60 * 1000);
    const appointment = await prisma.appointment.create({
      data: {
        customerId: customer.userId,
        mentorProfileId: mentor.mentorProfileId,
        offeringId: mentor.offeringId,
        startAt,
        endAt,
        status: "CONFIRMED", // persisted CONFIRMED, but endAt is in the past
        connectionMode: "GOOGLE_MEET",
        mentorTimezone: "UTC",
        offeringSnapshot: { name: "Career Deep Dive", durationMinutes: 45, price: 400, currency: "INR" },
      },
    });

    const res = await request(app).patch(`/api/appointments/${appointment.id}/cancel`).set("Cookie", customer.authCookie);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("APPOINTMENT_ALREADY_COMPLETED");
  });
});

describe("Timezone correctness", () => {
  it("33. rejects a startAt with no timezone/offset designator (not an absolute instant)", async () => {
    const mentor = await makeReadyMentor();
    const customer = await registerCustomerAndGetAuthCookie();
    const date = nextDateForIsoDayOfWeek(1, 7);
    const res = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, `${date}T18:00:00`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("34 & 35. mentor-local conversion (not UTC clock time) determines validity, and the appointment stores UTC + mentor timezone", async () => {
    const mentor = await makeReadyMentor({ timezone: "Asia/Kolkata", startTime: "18:00", endTime: "20:00" });
    const customer = await registerCustomerAndGetAuthCookie();
    const date = nextDateForIsoDayOfWeek(1, 7);

    // 18:00 IST = 12:30 UTC. Requesting 18:00 UTC (a different absolute
    // instant, and one that lands at 23:30 IST — outside the window) must be
    // rejected; only the correctly-converted instant is accepted.
    const wrongInstant = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, `${date}T18:00:00.000Z`);
    expect(wrongInstant.status).toBe(400);
    expect(wrongInstant.body.error.code).toBe("INVALID_SLOT");

    const correctInstant = `${date}T12:30:00.000Z`;
    const res = await bookSlot(customer.authCookie, mentor.mentorProfileId, mentor.offeringId, correctInstant);
    expect(res.status).toBe(201);
    expect(res.body.data.appointment.startAt).toBe(correctInstant);
    expect(res.body.data.appointment.mentorTimezone).toBe("Asia/Kolkata");

    const stored = await prisma.appointment.findUniqueOrThrow({ where: { id: res.body.data.appointment.id } });
    expect(stored.startAt.toISOString()).toBe(correctInstant);
    expect(stored.mentorTimezone).toBe("Asia/Kolkata");
  });
});
