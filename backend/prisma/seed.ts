import bcrypt from "bcrypt";
import { Temporal } from "@js-temporal/polyfill";
import {
  PrismaClient,
  Role,
  AppointmentStatus,
  ConnectionMode,
  AvailabilityCategory,
  Category,
  DayOfWeek,
} from "@prisma/client";

const prisma = new PrismaClient();

// Every seeded account shares this password so a reviewer can log in as any
// demo user — see README.md "Demo Accounts". Hashed with the same cost
// factor auth.service.ts uses (BCRYPT_ROUNDS = 12), never stored in plaintext.
const DEMO_PASSWORD = "MentoraDemo123!";
const BCRYPT_ROUNDS = 12;

// --- Timezone-aware helpers ---------------------------------------------
// Appointment instants are computed by interpreting a local wall-clock time
// in a specific mentor's IANA timezone, then converting to a UTC Instant —
// the same rule the real slot-generation/booking service will follow.

function localToUtcDate(
  timeZone: string | null,
  plainDate: Temporal.PlainDate,
  plainTime: Temporal.PlainTime,
): Date {
  if (!timeZone) {
    throw new Error("Cannot compute an appointment instant for a mentor with no timezone set.");
  }
  const zoned = plainDate.toZonedDateTime({ timeZone, plainTime });
  return new Date(zoned.toInstant().epochMilliseconds);
}

const ISO_DOW: Record<number, DayOfWeek> = {
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
  7: DayOfWeek.SUNDAY,
};

function timeOfDay(hour: number, minute = 0): Date {
  // AvailabilityRule.startTime/endTime are @db.Time — Prisma models these as
  // a Date where only the time-of-day component is meaningful.
  return new Date(Date.UTC(1970, 0, 1, hour, minute, 0));
}

/** Next date (today inclusive) matching the given ISO day-of-week, at least `minDaysAhead` away. */
function nextDateOnWeekday(isoDow: number, minDaysAhead: number): Temporal.PlainDate {
  let date = Temporal.Now.plainDateISO().add({ days: minDaysAhead });
  while (date.dayOfWeek !== isoDow) {
    date = date.add({ days: 1 });
  }
  return date;
}

/** Most recent date (before today) matching the given ISO day-of-week, at least `minDaysAgo` in the past. */
function pastDateOnWeekday(isoDow: number, minDaysAgo: number): Temporal.PlainDate {
  let date = Temporal.Now.plainDateISO().subtract({ days: minDaysAgo });
  while (date.dayOfWeek !== isoDow) {
    date = date.subtract({ days: 1 });
  }
  return date;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  // Clean slate — dev seed only, safe to rerun.
  await prisma.review.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.availabilityRule.deleteMany();
  await prisma.offering.deleteMany();
  await prisma.experienceEntry.deleteMany();
  await prisma.mentorProfile.deleteMany();
  await prisma.user.deleteMany();

  // --- Mentors -----------------------------------------------------------

  const priyaUser = await prisma.user.create({
    data: {
      email: "priya.sharma@mentora.dev",
      passwordHash,
      role: Role.MENTOR,
      name: "Priya Sharma",
    },
  });
  const priya = await prisma.mentorProfile.create({
    data: {
      userId: priyaUser.id,
      headline: "Senior Software Engineer",
      bio: "8 years building distributed systems. I help engineers navigate career growth and system design interviews.",
      country: "IN",
      timezone: "Asia/Kolkata",
      yearsExperience: 8,
      primaryCategory: Category.CAREER_GROWTH,
      tags: ["Career Growth", "System Design", "Software Engineering"],
      connectionModes: [ConnectionMode.GOOGLE_MEET, ConnectionMode.ZOOM],
      avatarUrl: "https://mentora-gwai5o90d-vijaykrishna68s-projects.vercel.app/mentors/priya-sharma.jpg",
      faq: [
        {
          question: "What can we discuss during this session?",
          answer: "Career direction, promotion strategy, or a system design mock interview.",
        },
        {
          question: "What should I prepare beforehand?",
          answer: "A short summary of your current role and what you're aiming for.",
        },
      ],
      acceptingBookings: true,
      onboardingComplete: true,
    },
  });
  await prisma.experienceEntry.createMany({
    data: [
      {
        mentorProfileId: priya.id,
        role: "Senior Software Engineer",
        organization: "Company X",
        startDate: new Date("2021-01-01"),
        endDate: null,
        order: 0,
      },
      {
        mentorProfileId: priya.id,
        role: "Software Engineer",
        organization: "Company Y",
        startDate: new Date("2018-01-01"),
        endDate: new Date("2020-12-31"),
        order: 1,
      },
    ],
  });
  const priyaCareerOffering = await prisma.offering.create({
    data: {
      mentorProfileId: priya.id,
      name: "Career Deep Dive",
      category: Category.CAREER_GROWTH,
      description: "A focused session on your career trajectory and next steps.",
      durationMinutes: 45,
      price: 400,
      currency: "INR",
      // Subset of priya.connectionModes above — every offering must support
      // at least one mode the mentor themselves supports.
      connectionModes: [ConnectionMode.GOOGLE_MEET, ConnectionMode.ZOOM],
      availabilityCategories: [AvailabilityCategory.EVENING],
    },
  });
  const priyaSystemDesignOffering = await prisma.offering.create({
    data: {
      mentorProfileId: priya.id,
      name: "System Design Mock",
      category: Category.SYSTEM_DESIGN,
      description: "A mock system design interview with detailed feedback.",
      durationMinutes: 60,
      price: 600,
      currency: "INR",
      connectionModes: [ConnectionMode.GOOGLE_MEET, ConnectionMode.ZOOM],
      availabilityCategories: [AvailabilityCategory.EVENING],
    },
  });
  await prisma.availabilityRule.createMany({
    data: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY].map(
      (dayOfWeek) => ({
        mentorProfileId: priya.id,
        dayOfWeek,
        startTime: timeOfDay(18, 0),
        endTime: timeOfDay(22, 0),
        bufferMinutes: 15,
      }),
    ),
  });

  const jamesUser = await prisma.user.create({
    data: {
      email: "james.carter@mentora.dev",
      passwordHash,
      role: Role.MENTOR,
      name: "James Carter",
    },
  });
  const james = await prisma.mentorProfile.create({
    data: {
      userId: jamesUser.id,
      headline: "Engineering Manager",
      bio: "I coach engineers preparing for interviews and new managers stepping into leadership.",
      country: "US",
      timezone: "America/New_York",
      phone: "+1-555-0142",
      yearsExperience: 12,
      primaryCategory: Category.LEADERSHIP,
      tags: ["Leadership", "Interview Preparation"],
      connectionModes: [ConnectionMode.ZOOM, ConnectionMode.PHONE],
      avatarUrl: "https://mentora-gwai5o90d-vijaykrishna68s-projects.vercel.app/mentors/james-carter.jpg",
      faq: [
        {
          question: "Who is this session suitable for?",
          answer: "Engineers preparing for interviews, and new or aspiring engineering managers.",
        },
      ],
      acceptingBookings: true,
      onboardingComplete: true,
    },
  });
  await prisma.experienceEntry.create({
    data: {
      mentorProfileId: james.id,
      role: "Engineering Manager",
      organization: "Company Z",
      startDate: new Date("2019-06-01"),
      endDate: null,
      order: 0,
    },
  });
  const jamesInterviewOffering = await prisma.offering.create({
    data: {
      mentorProfileId: james.id,
      name: "Interview Prep Session",
      category: Category.INTERVIEW_PREPARATION,
      description: "Mock behavioral and technical interview with structured feedback.",
      durationMinutes: 30,
      price: 40,
      currency: "USD",
      // Subset of james.connectionModes above.
      connectionModes: [ConnectionMode.ZOOM, ConnectionMode.PHONE],
      availabilityCategories: [AvailabilityCategory.MORNING],
    },
  });
  const jamesLeadershipOffering = await prisma.offering.create({
    data: {
      mentorProfileId: james.id,
      name: "Leadership Coaching",
      category: Category.LEADERSHIP,
      description: "1:1 coaching for new and aspiring engineering managers.",
      durationMinutes: 60,
      price: 90,
      currency: "USD",
      connectionModes: [ConnectionMode.ZOOM, ConnectionMode.PHONE],
      availabilityCategories: [AvailabilityCategory.MORNING],
    },
  });
  await prisma.availabilityRule.createMany({
    data: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY].map((dayOfWeek) => ({
      mentorProfileId: james.id,
      dayOfWeek,
      startTime: timeOfDay(7, 0),
      endTime: timeOfDay(10, 0),
      bufferMinutes: 10,
    })),
  });

  const aikoUser = await prisma.user.create({
    data: {
      email: "aiko.tanaka@mentora.dev",
      passwordHash,
      role: Role.MENTOR,
      name: "Aiko Tanaka",
    },
  });
  const aiko = await prisma.mentorProfile.create({
    data: {
      userId: aikoUser.id,
      headline: "Frontend Architect",
      bio: "I help frontend engineers level up their architecture and component design skills.",
      country: "JP",
      timezone: "Asia/Tokyo",
      yearsExperience: 10,
      primaryCategory: Category.FRONTEND,
      tags: ["Frontend", "Entrepreneurship"],
      connectionModes: [ConnectionMode.GOOGLE_MEET, ConnectionMode.IN_PERSON],
      faq: [],
      // Currently not accepting new bookings — exercises the global toggle
      // while keeping her existing data (offerings, availability) intact.
      acceptingBookings: false,
      onboardingComplete: true,
    },
  });
  const aikoOffering = await prisma.offering.create({
    data: {
      mentorProfileId: aiko.id,
      name: "Frontend Architecture Review",
      category: Category.FRONTEND,
      description: "Deep-dive review of your frontend architecture and component structure.",
      durationMinutes: 45,
      price: 5000,
      currency: "JPY",
      // Matches aiko.connectionModes above.
      connectionModes: [ConnectionMode.GOOGLE_MEET, ConnectionMode.IN_PERSON],
      availabilityCategories: [AvailabilityCategory.MORNING],
    },
  });
  await prisma.availabilityRule.createMany({
    data: [DayOfWeek.SATURDAY, DayOfWeek.SUNDAY].map((dayOfWeek) => ({
      mentorProfileId: aiko.id,
      dayOfWeek,
      startTime: timeOfDay(10, 0),
      endTime: timeOfDay(13, 0),
      bufferMinutes: 20,
    })),
  });

  const diegoUser = await prisma.user.create({
    data: {
      email: "diego.fernandez@mentora.dev",
      passwordHash,
      role: Role.MENTOR,
      name: "Diego Fernandez",
    },
  });
  const diego = await prisma.mentorProfile.create({
    data: {
      userId: diegoUser.id,
      headline: "Backend Engineer",
      bio: "Backend and infrastructure mentoring — just getting started on Mentora.",
      country: "ES",
      timezone: "Europe/Madrid",
      yearsExperience: 6,
      primaryCategory: Category.BACKEND,
      tags: ["Backend"],
      connectionModes: [ConnectionMode.GOOGLE_MEET],
      faq: [],
      acceptingBookings: true,
      onboardingComplete: true,
    },
  });
  await prisma.offering.create({
    data: {
      mentorProfileId: diego.id,
      name: "Backend Systems Mentoring",
      category: Category.BACKEND,
      description: "1:1 mentoring on backend architecture and scaling.",
      durationMinutes: 45,
      price: 35,
      currency: "EUR",
      // Matches diego.connectionModes above.
      connectionModes: [ConnectionMode.GOOGLE_MEET],
      availabilityCategories: [AvailabilityCategory.MORNING, AvailabilityCategory.AFTERNOON, AvailabilityCategory.EVENING],
    },
  });
  // Intentionally no availability rules and no appointments for Diego —
  // covers "mentor with no availability" / "mentor with no appointments".

  // --- Customers -----------------------------------------------------------

  const ananya = await prisma.user.create({
    data: {
      email: "ananya.verma@mentora.dev",
      passwordHash,
      role: Role.CUSTOMER,
      name: "Ananya Verma",
      interests: [Category.CAREER_GROWTH, Category.SYSTEM_DESIGN],
    },
  });
  const michael = await prisma.user.create({
    data: {
      email: "michael.chen@mentora.dev",
      passwordHash,
      role: Role.CUSTOMER,
      name: "Michael Chen",
      interests: [Category.INTERVIEW_PREPARATION, Category.LEADERSHIP],
    },
  });
  const sara = await prisma.user.create({
    data: {
      email: "sara.ahmed@mentora.dev",
      passwordHash,
      role: Role.CUSTOMER,
      name: "Sara Ahmed",
      // Skipped the optional interests step during onboarding.
      interests: [],
    },
  });

  // --- Appointments --------------------------------------------------------

  // Upcoming: Ananya <> Priya, Tuesday 18:00 IST, at least 7 days out.
  const upcoming1Date = nextDateOnWeekday(2 /* Tuesday */, 7);
  const upcoming1Start = localToUtcDate(priya.timezone, upcoming1Date, Temporal.PlainTime.from("18:00"));
  const upcoming1End = localToUtcDate(priya.timezone, upcoming1Date, Temporal.PlainTime.from("18:45"));
  await prisma.appointment.create({
    data: {
      customerId: ananya.id,
      mentorProfileId: priya.id,
      offeringId: priyaCareerOffering.id,
      startAt: upcoming1Start,
      endAt: upcoming1End,
      status: AppointmentStatus.CONFIRMED,
      connectionMode: ConnectionMode.GOOGLE_MEET,
      mentorTimezone: priya.timezone!,
      connectionDetail: null,
      offeringSnapshot: {
        name: priyaCareerOffering.name,
        durationMinutes: priyaCareerOffering.durationMinutes,
        price: Number(priyaCareerOffering.price),
        currency: priyaCareerOffering.currency,
      },
    },
  });

  // Upcoming: Michael <> James, Monday 08:00 America/New_York, at least 5 days out.
  const upcoming2Date = nextDateOnWeekday(1 /* Monday */, 5);
  const upcoming2Start = localToUtcDate(james.timezone, upcoming2Date, Temporal.PlainTime.from("08:00"));
  const upcoming2End = localToUtcDate(james.timezone, upcoming2Date, Temporal.PlainTime.from("08:30"));
  await prisma.appointment.create({
    data: {
      customerId: michael.id,
      mentorProfileId: james.id,
      offeringId: jamesInterviewOffering.id,
      startAt: upcoming2Start,
      endAt: upcoming2End,
      status: AppointmentStatus.CONFIRMED,
      connectionMode: ConnectionMode.ZOOM,
      mentorTimezone: james.timezone!,
      connectionDetail: null,
      offeringSnapshot: {
        name: jamesInterviewOffering.name,
        durationMinutes: jamesInterviewOffering.durationMinutes,
        price: Number(jamesInterviewOffering.price),
        currency: jamesInterviewOffering.currency,
      },
    },
  });

  // Past / effectively COMPLETED (CONFIRMED + endAt in the past), with a review.
  const past1Date = pastDateOnWeekday(2 /* Tuesday */, 14);
  const past1Start = localToUtcDate(priya.timezone, past1Date, Temporal.PlainTime.from("19:00"));
  const past1End = localToUtcDate(priya.timezone, past1Date, Temporal.PlainTime.from("20:00"));
  const past1Appointment = await prisma.appointment.create({
    data: {
      customerId: ananya.id,
      mentorProfileId: priya.id,
      offeringId: priyaSystemDesignOffering.id,
      startAt: past1Start,
      endAt: past1End,
      status: AppointmentStatus.CONFIRMED,
      connectionMode: ConnectionMode.GOOGLE_MEET,
      mentorTimezone: priya.timezone!,
      connectionDetail: null,
      offeringSnapshot: {
        name: priyaSystemDesignOffering.name,
        durationMinutes: priyaSystemDesignOffering.durationMinutes,
        price: Number(priyaSystemDesignOffering.price),
        currency: priyaSystemDesignOffering.currency,
      },
    },
  });
  await prisma.review.create({
    data: {
      appointmentId: past1Appointment.id,
      customerId: ananya.id,
      mentorProfileId: priya.id,
      rating: 5,
      comment: "Priya gave me incredibly clear, actionable advice for my system design interview.",
    },
  });

  // Past / effectively COMPLETED, no review yet — exercises "eligible but unreviewed".
  const past2Date = pastDateOnWeekday(5 /* Friday */, 10);
  const past2Start = localToUtcDate(james.timezone, past2Date, Temporal.PlainTime.from("09:00"));
  const past2End = localToUtcDate(james.timezone, past2Date, Temporal.PlainTime.from("10:00"));
  await prisma.appointment.create({
    data: {
      customerId: michael.id,
      mentorProfileId: james.id,
      offeringId: jamesLeadershipOffering.id,
      startAt: past2Start,
      endAt: past2End,
      status: AppointmentStatus.CONFIRMED,
      connectionMode: ConnectionMode.PHONE,
      mentorTimezone: james.timezone!,
      connectionDetail: james.phone,
      offeringSnapshot: {
        name: jamesLeadershipOffering.name,
        durationMinutes: jamesLeadershipOffering.durationMinutes,
        price: Number(jamesLeadershipOffering.price),
        currency: jamesLeadershipOffering.currency,
      },
    },
  });

  // Cancelled appointment — no longer blocks availability.
  const cancelledDate = nextDateOnWeekday(2 /* Tuesday */, 7);
  const cancelledStart = localToUtcDate(priya.timezone, cancelledDate, Temporal.PlainTime.from("20:00"));
  const cancelledEnd = localToUtcDate(priya.timezone, cancelledDate, Temporal.PlainTime.from("20:45"));
  await prisma.appointment.create({
    data: {
      customerId: sara.id,
      mentorProfileId: priya.id,
      offeringId: priyaCareerOffering.id,
      startAt: cancelledStart,
      endAt: cancelledEnd,
      status: AppointmentStatus.CANCELLED,
      connectionMode: ConnectionMode.GOOGLE_MEET,
      mentorTimezone: priya.timezone!,
      connectionDetail: null,
      offeringSnapshot: {
        name: priyaCareerOffering.name,
        durationMinutes: priyaCareerOffering.durationMinutes,
        price: Number(priyaCareerOffering.price),
        currency: priyaCareerOffering.currency,
      },
    },
  });

  console.log("Seed complete:");
  console.log("  Mentors: Priya Sharma, James Carter, Aiko Tanaka (booking off), Diego Fernandez (no availability/appointments)");
  console.log("  Customers: Ananya Verma, Michael Chen, Sara Ahmed (no interests)");
  console.log("  Appointments: 2 upcoming, 2 past/completed (1 reviewed), 1 cancelled");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
