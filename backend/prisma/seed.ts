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
  type MentorProfile,
  type Offering,
} from "@prisma/client";

const prisma = new PrismaClient();

// Portraits are static files in frontend/public/mentors/, served by the
// Vercel frontend. MentorProfile.avatarUrl is validated as an absolute URL
// (mentor-profile.schema.ts), so the stable production origin is used here.
// Mentors without a portrait leave avatarUrl null and the UI falls back to
// an initials avatar.
const PORTRAIT_BASE_URL = "https://mentora-two-ruddy.vercel.app/mentors";

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

// --- Data-driven helpers for the additional marketplace mentors -------------

interface MentorSpec {
  email: string;
  name: string;
  headline: string;
  bio: string;
  country: string;
  timezone: string;
  phone?: string;
  yearsExperience: number;
  primaryCategory: Category;
  tags: string[];
  connectionModes: ConnectionMode[];
  faq: { question: string; answer: string }[];
  experience: { role: string; organization: string; startDate: string; endDate?: string; description: string }[];
  // Each offering's connectionModes must be a subset of the mentor's own.
  offerings: {
    key: string;
    name: string;
    category: Category;
    description: string;
    durationMinutes: number;
    price: number;
    currency: string;
    connectionModes: ConnectionMode[];
    availabilityCategories: AvailabilityCategory[];
  }[];
  availability: { days: DayOfWeek[]; start: [number, number]; end: [number, number]; bufferMinutes: number }[];
}

// Creates a fully onboarded, discoverable mentor (readiness: headline, bio,
// timezone, active offering, active availability rule, accepting bookings).
async function createMentor(spec: MentorSpec, passwordHash: string) {
  const user = await prisma.user.create({
    data: { email: spec.email, passwordHash, role: Role.MENTOR, name: spec.name },
  });
  const profile = await prisma.mentorProfile.create({
    data: {
      userId: user.id,
      headline: spec.headline,
      bio: spec.bio,
      country: spec.country,
      timezone: spec.timezone,
      phone: spec.phone,
      yearsExperience: spec.yearsExperience,
      primaryCategory: spec.primaryCategory,
      tags: spec.tags,
      connectionModes: spec.connectionModes,
      faq: spec.faq,
      acceptingBookings: true,
      onboardingComplete: true,
    },
  });
  await prisma.experienceEntry.createMany({
    data: spec.experience.map((entry, order) => ({
      mentorProfileId: profile.id,
      role: entry.role,
      organization: entry.organization,
      startDate: new Date(entry.startDate),
      endDate: entry.endDate ? new Date(entry.endDate) : null,
      description: entry.description,
      order,
    })),
  });

  const offerings: Record<string, Offering> = {};
  for (const offering of spec.offerings) {
    offerings[offering.key] = await prisma.offering.create({
      data: {
        mentorProfileId: profile.id,
        name: offering.name,
        category: offering.category,
        description: offering.description,
        durationMinutes: offering.durationMinutes,
        price: offering.price,
        currency: offering.currency,
        connectionModes: offering.connectionModes,
        availabilityCategories: offering.availabilityCategories,
      },
    });
  }

  await prisma.availabilityRule.createMany({
    data: spec.availability.flatMap((window) =>
      window.days.map((dayOfWeek) => ({
        mentorProfileId: profile.id,
        dayOfWeek,
        startTime: timeOfDay(window.start[0], window.start[1]),
        endTime: timeOfDay(window.end[0], window.end[1]),
        bufferMinutes: window.bufferMinutes,
      })),
    ),
  });

  return { profile, offerings };
}

// A CONFIRMED appointment (past => effectively COMPLETED) with the same
// snapshot shape the booking service writes, plus an optional review.
async function seedSession(args: {
  customerId: string;
  mentor: MentorProfile;
  offering: Offering;
  date: Temporal.PlainDate;
  startTime: string; // "HH:mm" wall-clock in the mentor's timezone
  connectionMode: ConnectionMode;
  review?: { rating: number; comment: string };
}) {
  const start = Temporal.PlainTime.from(args.startTime);
  const end = start.add({ minutes: args.offering.durationMinutes });
  const appointment = await prisma.appointment.create({
    data: {
      customerId: args.customerId,
      mentorProfileId: args.mentor.id,
      offeringId: args.offering.id,
      startAt: localToUtcDate(args.mentor.timezone, args.date, start),
      endAt: localToUtcDate(args.mentor.timezone, args.date, end),
      status: AppointmentStatus.CONFIRMED,
      connectionMode: args.connectionMode,
      mentorTimezone: args.mentor.timezone!,
      connectionDetail: args.connectionMode === ConnectionMode.PHONE ? args.mentor.phone : null,
      offeringSnapshot: {
        name: args.offering.name,
        durationMinutes: args.offering.durationMinutes,
        price: Number(args.offering.price),
        currency: args.offering.currency,
      },
    },
  });
  if (args.review) {
    await prisma.review.create({
      data: {
        appointmentId: appointment.id,
        customerId: args.customerId,
        mentorProfileId: args.mentor.id,
        rating: args.review.rating,
        comment: args.review.comment,
      },
    });
  }
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
      avatarUrl: `${PORTRAIT_BASE_URL}/priya-sharma.jpg`,
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
      avatarUrl: `${PORTRAIT_BASE_URL}/james-carter.jpg`,
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

  // --- Additional marketplace mentors ---------------------------------------
  // Six fully onboarded, discoverable mentors so Discover reads like a real
  // directory: one per remaining primary category, across different
  // countries/timezones, price points, durations and connection modes.
  // Portraits are intentionally omitted (avatarUrl stays null → initials).

  const { profile: sofia, offerings: sofiaOfferings } = await createMentor(
    {
      email: "sofia.almeida@mentora.dev",
      name: "Sofia Almeida",
      headline: "Staff Frontend Engineer",
      bio: "Nine years building design systems and large React applications, most recently leading a web platform team at a European fintech. I mentor engineers on component architecture, web performance and growing into staff-level scope.",
      country: "PT",
      timezone: "Europe/Lisbon",
      yearsExperience: 9,
      primaryCategory: Category.FRONTEND,
      tags: ["React", "TypeScript", "Design Systems", "Web Performance"],
      connectionModes: [ConnectionMode.GOOGLE_MEET, ConnectionMode.ZOOM],
      faq: [
        {
          question: "Can I bring my own codebase?",
          answer: "Yes — share a repo or a few key components beforehand and we'll review them together.",
        },
        {
          question: "Do you cover testing and performance?",
          answer: "Both. Most sessions include a look at rendering performance and a pragmatic testing strategy.",
        },
      ],
      experience: [
        {
          role: "Staff Frontend Engineer",
          organization: "Meridian Pay",
          startDate: "2022-03-01",
          description: "Lead the web platform team and the design system used across 14 product squads.",
        },
        {
          role: "Senior Frontend Engineer",
          organization: "Atlas Commerce",
          startDate: "2019-02-01",
          endDate: "2022-02-28",
          description: "Rebuilt the storefront in React and TypeScript, cutting largest contentful paint by 40%.",
        },
        {
          role: "Frontend Developer",
          organization: "Fieldnote Studio",
          startDate: "2017-01-01",
          endDate: "2019-01-31",
          description: "Shipped client web apps for media and nonprofit organisations.",
        },
      ],
      offerings: [
        {
          key: "react",
          name: "React Architecture Review",
          category: Category.FRONTEND,
          description: "Review your component structure, state management and performance hot spots, with a concrete refactoring plan.",
          durationMinutes: 60,
          price: 60,
          currency: "EUR",
          connectionModes: [ConnectionMode.GOOGLE_MEET, ConnectionMode.ZOOM],
          availabilityCategories: [AvailabilityCategory.MORNING, AvailabilityCategory.AFTERNOON],
        },
        {
          key: "roadmap",
          name: "Frontend Career Roadmap",
          category: Category.CAREER_GROWTH,
          description: "Map the skills and scope you need for your next level — senior, staff or tech lead.",
          durationMinutes: 45,
          price: 45,
          currency: "EUR",
          connectionModes: [ConnectionMode.GOOGLE_MEET, ConnectionMode.ZOOM],
          availabilityCategories: [AvailabilityCategory.AFTERNOON],
        },
      ],
      availability: [
        { days: [DayOfWeek.TUESDAY], start: [14, 0], end: [18, 0], bufferMinutes: 15 },
        { days: [DayOfWeek.THURSDAY], start: [9, 0], end: [13, 0], bufferMinutes: 15 },
      ],
    },
    passwordHash,
  );

  const { profile: arjun, offerings: arjunOfferings } = await createMentor(
    {
      email: "arjun.nair@mentora.dev",
      name: "Arjun Nair",
      headline: "Principal Backend Engineer",
      bio: "Thirteen years designing payments and ledger systems on PostgreSQL. I help backend engineers reason about data models, consistency and service boundaries — and prepare for principal-level design discussions.",
      country: "SG",
      timezone: "Asia/Singapore",
      yearsExperience: 13,
      primaryCategory: Category.BACKEND,
      tags: ["Backend", "PostgreSQL", "Distributed Systems", "API Design"],
      connectionModes: [ConnectionMode.GOOGLE_MEET, ConnectionMode.ZOOM],
      faq: [
        {
          question: "Which stacks do you work with?",
          answer: "Mostly Node.js, Go and Java services on PostgreSQL, but the principles carry across stacks.",
        },
      ],
      experience: [
        {
          role: "Principal Backend Engineer",
          organization: "Harbor Payments",
          startDate: "2020-05-01",
          description: "Own the ledger and settlement services that process millions of transactions a day.",
        },
        {
          role: "Senior Backend Engineer",
          organization: "Kestrel Logistics",
          startDate: "2016-08-01",
          endDate: "2020-04-30",
          description: "Designed event-driven order tracking on PostgreSQL and Kafka.",
        },
        {
          role: "Software Engineer",
          organization: "Tidewater Systems",
          startDate: "2013-07-01",
          endDate: "2016-07-31",
          description: "Built internal APIs and batch pipelines for a logistics platform.",
        },
      ],
      offerings: [
        {
          key: "architecture",
          name: "Backend Architecture Session",
          category: Category.BACKEND,
          description: "Walk through your service boundaries, data model and failure modes and leave with a prioritised list of changes.",
          durationMinutes: 60,
          price: 85,
          currency: "SGD",
          connectionModes: [ConnectionMode.GOOGLE_MEET, ConnectionMode.ZOOM],
          availabilityCategories: [AvailabilityCategory.EVENING],
        },
        {
          key: "database",
          name: "Database & API Design Review",
          category: Category.BACKEND,
          description: "A focused review of your schema, indexing and API contracts.",
          durationMinutes: 45,
          price: 65,
          currency: "SGD",
          connectionModes: [ConnectionMode.GOOGLE_MEET],
          availabilityCategories: [AvailabilityCategory.MORNING, AvailabilityCategory.EVENING],
        },
      ],
      availability: [
        { days: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY], start: [18, 30], end: [21, 30], bufferMinutes: 15 },
        { days: [DayOfWeek.SATURDAY], start: [9, 0], end: [12, 0], bufferMinutes: 10 },
      ],
    },
    passwordHash,
  );

  const { profile: nadia, offerings: nadiaOfferings } = await createMentor(
    {
      email: "nadia.haddad@mentora.dev",
      name: "Nadia Haddad",
      headline: "Staff Engineer, Distributed Systems",
      bio: "Eleven years building multi-region data platforms. I run realistic system design mock interviews and architecture reviews, and coach engineers on making trade-offs explicit.",
      country: "CA",
      timezone: "America/Toronto",
      yearsExperience: 11,
      primaryCategory: Category.SYSTEM_DESIGN,
      tags: ["System Design", "Distributed Systems", "Scalability", "Staff+"],
      connectionModes: [ConnectionMode.GOOGLE_MEET, ConnectionMode.ZOOM],
      faq: [
        {
          question: "Do you run mock interviews?",
          answer: "Yes. The deep dive is structured like a staff-level system design interview, followed by detailed feedback.",
        },
        {
          question: "Can we review a real system instead?",
          answer: "Absolutely — the scaling review is designed for your own architecture.",
        },
      ],
      experience: [
        {
          role: "Staff Engineer, Distributed Systems",
          organization: "Northgate Cloud",
          startDate: "2021-09-01",
          description: "Architect the multi-region data platform and mentor 20+ engineers on system design.",
        },
        {
          role: "Senior Software Engineer",
          organization: "Brightline Data",
          startDate: "2018-01-01",
          endDate: "2021-08-31",
          description: "Led the redesign of a streaming ingestion pipeline handling billions of events a month.",
        },
        {
          role: "Software Engineer",
          organization: "Quill Analytics",
          startDate: "2015-06-01",
          endDate: "2017-12-31",
          description: "Built reporting services and internal tooling for a B2B analytics product.",
        },
      ],
      offerings: [
        {
          key: "deepDive",
          name: "System Design Deep Dive",
          category: Category.SYSTEM_DESIGN,
          description: "A 90-minute mock system design interview followed by structured feedback on your approach.",
          durationMinutes: 90,
          price: 110,
          currency: "CAD",
          connectionModes: [ConnectionMode.GOOGLE_MEET, ConnectionMode.ZOOM],
          availabilityCategories: [AvailabilityCategory.MORNING, AvailabilityCategory.EVENING],
        },
        {
          key: "scaling",
          name: "Scaling Review",
          category: Category.SYSTEM_DESIGN,
          description: "Bring a real system and its bottlenecks; leave with options and trade-offs.",
          durationMinutes: 45,
          price: 60,
          currency: "CAD",
          connectionModes: [ConnectionMode.ZOOM],
          availabilityCategories: [
            AvailabilityCategory.MORNING,
            AvailabilityCategory.AFTERNOON,
            AvailabilityCategory.EVENING,
          ],
        },
      ],
      availability: [
        { days: [DayOfWeek.TUESDAY, DayOfWeek.THURSDAY], start: [17, 30], end: [21, 30], bufferMinutes: 15 },
        { days: [DayOfWeek.SUNDAY], start: [10, 0], end: [13, 0], bufferMinutes: 15 },
      ],
    },
    passwordHash,
  );

  const { profile: david, offerings: davidOfferings } = await createMentor(
    {
      email: "david.okafor@mentora.dev",
      name: "David Okafor",
      headline: "Senior Software Engineer & Interview Coach",
      bio: "I've sat on a hiring committee and run over a hundred technical interviews. I run mock coding and behavioural interviews that feel like the real thing, with specific, kind feedback.",
      country: "GB",
      timezone: "Europe/London",
      phone: "+44 20 7946 0958",
      yearsExperience: 9,
      primaryCategory: Category.INTERVIEW_PREPARATION,
      tags: ["Interview Preparation", "Algorithms", "Behavioural Interviews", "Offer Strategy"],
      connectionModes: [ConnectionMode.ZOOM, ConnectionMode.GOOGLE_MEET, ConnectionMode.PHONE],
      faq: [
        {
          question: "Which language should I use in the mock interview?",
          answer: "Whichever you'll use in your real interviews — I'm comfortable with Python, Java, TypeScript and Go.",
        },
      ],
      experience: [
        {
          role: "Senior Software Engineer",
          organization: "Ridgeway Software",
          startDate: "2021-01-01",
          description: "Interview 150+ candidates and sit on the engineering hiring committee.",
        },
        {
          role: "Software Engineer",
          organization: "Copperleaf Health",
          startDate: "2017-09-01",
          endDate: "2020-12-31",
          description: "Built clinical scheduling services in Java and PostgreSQL.",
        },
      ],
      offerings: [
        {
          key: "coding",
          name: "Mock Coding Interview",
          category: Category.INTERVIEW_PREPARATION,
          description: "A timed coding interview with live feedback on problem solving, communication and code quality.",
          durationMinutes: 60,
          price: 65,
          currency: "GBP",
          connectionModes: [ConnectionMode.ZOOM, ConnectionMode.GOOGLE_MEET],
          availabilityCategories: [AvailabilityCategory.MORNING, AvailabilityCategory.EVENING],
        },
        {
          key: "behavioural",
          name: "Behavioural Interview Prep",
          category: Category.INTERVIEW_PREPARATION,
          description: "Shape your stories, practise delivery and get feedback on how they land.",
          durationMinutes: 45,
          price: 45,
          currency: "GBP",
          connectionModes: [ConnectionMode.ZOOM, ConnectionMode.GOOGLE_MEET, ConnectionMode.PHONE],
          availabilityCategories: [AvailabilityCategory.MORNING, AvailabilityCategory.EVENING],
        },
      ],
      availability: [
        {
          days: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY],
          start: [18, 0],
          end: [21, 0],
          bufferMinutes: 10,
        },
        { days: [DayOfWeek.SATURDAY], start: [10, 0], end: [13, 0], bufferMinutes: 10 },
      ],
    },
    passwordHash,
  );

  const { profile: camila, offerings: camilaOfferings } = await createMentor(
    {
      email: "camila.reyes@mentora.dev",
      name: "Camila Reyes",
      headline: "Founder & Product Lead",
      bio: "Co-founded two B2B software companies, one of which was acquired. I work with first-time founders on validating ideas, finding early customers and deciding what not to build.",
      country: "MX",
      timezone: "America/Mexico_City",
      phone: "+52 55 5555 0187",
      yearsExperience: 10,
      primaryCategory: Category.ENTREPRENEURSHIP,
      tags: ["Entrepreneurship", "Startups", "Product Strategy", "Go-to-market"],
      connectionModes: [ConnectionMode.ZOOM, ConnectionMode.GOOGLE_MEET, ConnectionMode.PHONE],
      faq: [
        {
          question: "Do I need a finished idea?",
          answer: "No. The validation workshop works from a rough idea and a list of assumptions.",
        },
      ],
      experience: [
        {
          role: "Co-founder & Product Lead",
          organization: "Sendero Labs",
          startDate: "2022-04-01",
          description: "Building logistics software for mid-sized distributors; seed-funded.",
        },
        {
          role: "Co-founder & CEO",
          organization: "Tiendita",
          startDate: "2018-01-01",
          endDate: "2021-12-31",
          description: "Founded a small-business e-commerce platform, acquired in 2021.",
        },
        {
          role: "Product Manager",
          organization: "Orbita Digital",
          startDate: "2016-05-01",
          endDate: "2017-12-31",
          description: "Owned onboarding and activation for a consumer subscription app.",
        },
      ],
      offerings: [
        {
          key: "officeHours",
          name: "Founder Office Hours",
          category: Category.ENTREPRENEURSHIP,
          description: "Bring your toughest founder question — pricing, first hires, fundraising or focus.",
          durationMinutes: 45,
          price: 70,
          currency: "USD",
          connectionModes: [ConnectionMode.ZOOM, ConnectionMode.GOOGLE_MEET, ConnectionMode.PHONE],
          availabilityCategories: [AvailabilityCategory.MORNING, AvailabilityCategory.AFTERNOON],
        },
        {
          key: "validation",
          name: "Idea Validation Workshop",
          category: Category.ENTREPRENEURSHIP,
          description: "Stress-test your idea, define the riskiest assumptions and design the cheapest experiments.",
          durationMinutes: 60,
          price: 95,
          currency: "USD",
          connectionModes: [ConnectionMode.ZOOM, ConnectionMode.GOOGLE_MEET],
          availabilityCategories: [AvailabilityCategory.AFTERNOON],
        },
      ],
      availability: [
        { days: [DayOfWeek.WEDNESDAY], start: [13, 0], end: [17, 0], bufferMinutes: 15 },
        { days: [DayOfWeek.FRIDAY], start: [9, 0], end: [13, 0], bufferMinutes: 15 },
      ],
    },
    passwordHash,
  );

  // Newly joined mentor: fully bookable, but no sessions or reviews yet — the
  // "unrated" state in Discover.
  await createMentor(
    {
      email: "amara.nwosu@mentora.dev",
      name: "Amara Nwosu",
      headline: "Engineering Manager & Career Coach",
      bio: "I moved from individual contributor to engineering manager at two fast-growing fintechs. I help engineers plan promotions, switch companies and negotiate offers with confidence.",
      country: "NG",
      timezone: "Africa/Lagos",
      yearsExperience: 10,
      primaryCategory: Category.CAREER_GROWTH,
      tags: ["Career Growth", "Promotion Strategy", "Salary Negotiation", "Engineering Management"],
      connectionModes: [ConnectionMode.GOOGLE_MEET, ConnectionMode.ZOOM],
      faq: [
        {
          question: "Can you help me prepare for a promotion review?",
          answer: "Yes — we'll map your impact to the level's expectations and plan how to present it.",
        },
      ],
      experience: [
        {
          role: "Engineering Manager",
          organization: "Savanna Fintech",
          startDate: "2022-01-01",
          description: "Manage two teams of eleven engineers and run the promotion and calibration process.",
        },
        {
          role: "Senior Software Engineer",
          organization: "Kora Mobile",
          startDate: "2018-06-01",
          endDate: "2021-12-31",
          description: "Led the mobile payments SDK used by partner apps across West Africa.",
        },
        {
          role: "Software Engineer",
          organization: "Ibis Systems",
          startDate: "2016-03-01",
          endDate: "2018-05-31",
          description: "Built back-office tooling for a regional bank.",
        },
      ],
      offerings: [
        {
          key: "strategy",
          name: "Career Strategy Session",
          category: Category.CAREER_GROWTH,
          description: "Clarify where you are, where you want to be in two years, and the next three moves.",
          durationMinutes: 45,
          price: 50,
          currency: "USD",
          connectionModes: [ConnectionMode.GOOGLE_MEET, ConnectionMode.ZOOM],
          availabilityCategories: [AvailabilityCategory.EVENING],
        },
        {
          key: "negotiation",
          name: "Offer Negotiation Coaching",
          category: Category.CAREER_GROWTH,
          description: "Plan and rehearse your negotiation before you respond to an offer.",
          durationMinutes: 30,
          price: 35,
          currency: "USD",
          connectionModes: [ConnectionMode.GOOGLE_MEET, ConnectionMode.ZOOM],
          availabilityCategories: [AvailabilityCategory.EVENING],
        },
      ],
      availability: [
        {
          days: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY],
          start: [17, 0],
          end: [20, 0],
          bufferMinutes: 10,
        },
      ],
    },
    passwordHash,
  );

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

  // --- Session history for the additional mentors ----------------------------
  // Separate reviewer accounts are used so the original demo customers'
  // appointment lists stay exactly as documented. All times are wall-clock in
  // the mentor's own timezone and sit inside that mentor's availability windows.

  const [rohan, emily, kwame, lucia] = await Promise.all(
    [
      { email: "rohan.iyer@mentora.dev", name: "Rohan Iyer", interests: [Category.FRONTEND, Category.CAREER_GROWTH] },
      {
        email: "emily.foster@mentora.dev",
        name: "Emily Foster",
        interests: [Category.INTERVIEW_PREPARATION, Category.SYSTEM_DESIGN],
      },
      { email: "kwame.boateng@mentora.dev", name: "Kwame Boateng", interests: [Category.BACKEND, Category.SYSTEM_DESIGN] },
      {
        email: "lucia.herrera@mentora.dev",
        name: "Lucia Herrera",
        interests: [Category.ENTREPRENEURSHIP, Category.LEADERSHIP],
      },
    ].map((customer) =>
      prisma.user.create({ data: { ...customer, passwordHash, role: Role.CUSTOMER } }),
    ),
  );

  // Sofia Almeida — 3 completed, 3 reviewed (avg 4.7) + 1 upcoming.
  await seedSession({
    customerId: rohan!.id,
    mentor: sofia,
    offering: sofiaOfferings.react!,
    date: pastDateOnWeekday(2, 21),
    startTime: "14:00",
    connectionMode: ConnectionMode.GOOGLE_MEET,
    review: {
      rating: 5,
      comment: "Sofia untangled our component boundaries in one session and left me with a concrete refactoring plan.",
    },
  });
  await seedSession({
    customerId: emily!.id,
    mentor: sofia,
    offering: sofiaOfferings.react!,
    date: pastDateOnWeekday(4, 12),
    startTime: "09:00",
    connectionMode: ConnectionMode.ZOOM,
    review: { rating: 5, comment: "Clear, practical and very well prepared. The performance tips alone were worth it." },
  });
  await seedSession({
    customerId: kwame!.id,
    mentor: sofia,
    offering: sofiaOfferings.roadmap!,
    date: pastDateOnWeekday(2, 33),
    startTime: "16:00",
    connectionMode: ConnectionMode.GOOGLE_MEET,
    review: { rating: 4, comment: "A helpful roadmap toward staff scope. I'd have liked a few more concrete examples." },
  });
  await seedSession({
    customerId: lucia!.id,
    mentor: sofia,
    offering: sofiaOfferings.react!,
    date: nextDateOnWeekday(4, 6),
    startTime: "10:00",
    connectionMode: ConnectionMode.ZOOM,
  });

  // Arjun Nair — 2 completed, 2 reviewed (avg 4.5).
  await seedSession({
    customerId: kwame!.id,
    mentor: arjun,
    offering: arjunOfferings.architecture!,
    date: pastDateOnWeekday(1, 15),
    startTime: "18:30",
    connectionMode: ConnectionMode.GOOGLE_MEET,
    review: {
      rating: 5,
      comment: "Arjun's breakdown of our event-sourcing trade-offs was the most useful hour I've had this quarter.",
    },
  });
  await seedSession({
    customerId: emily!.id,
    mentor: arjun,
    offering: arjunOfferings.database!,
    date: pastDateOnWeekday(6, 20),
    startTime: "09:00",
    connectionMode: ConnectionMode.GOOGLE_MEET,
    review: { rating: 4, comment: "Solid review of my schema and indexing choices, with good follow-up reading." },
  });

  // Nadia Haddad — 4 completed, 3 reviewed (avg 5.0) + 1 upcoming.
  await seedSession({
    customerId: emily!.id,
    mentor: nadia,
    offering: nadiaOfferings.deepDive!,
    date: pastDateOnWeekday(2, 9),
    startTime: "17:30",
    connectionMode: ConnectionMode.GOOGLE_MEET,
    review: {
      rating: 5,
      comment: "The most realistic system design mock I've done. Nadia pushed exactly where a staff interviewer would.",
    },
  });
  await seedSession({
    customerId: rohan!.id,
    mentor: nadia,
    offering: nadiaOfferings.deepDive!,
    date: pastDateOnWeekday(4, 24),
    startTime: "19:00",
    connectionMode: ConnectionMode.ZOOM,
    review: { rating: 5, comment: "Superb structure for thinking through trade-offs out loud." },
  });
  await seedSession({
    customerId: kwame!.id,
    mentor: nadia,
    offering: nadiaOfferings.scaling!,
    date: pastDateOnWeekday(7, 16),
    startTime: "10:00",
    connectionMode: ConnectionMode.ZOOM,
    review: { rating: 5, comment: "A concise, incisive review of our queueing design." },
  });
  await seedSession({
    customerId: lucia!.id,
    mentor: nadia,
    offering: nadiaOfferings.scaling!,
    date: pastDateOnWeekday(2, 30),
    startTime: "20:00",
    connectionMode: ConnectionMode.ZOOM,
  });
  await seedSession({
    customerId: emily!.id,
    mentor: nadia,
    offering: nadiaOfferings.scaling!,
    date: nextDateOnWeekday(2, 8),
    startTime: "18:00",
    connectionMode: ConnectionMode.ZOOM,
  });

  // David Okafor — 5 completed, 4 reviewed (avg 4.5).
  await seedSession({
    customerId: rohan!.id,
    mentor: david,
    offering: davidOfferings.coding!,
    date: pastDateOnWeekday(1, 8),
    startTime: "18:00",
    connectionMode: ConnectionMode.ZOOM,
    review: {
      rating: 5,
      comment: "David's mock interview felt exactly like the real thing, and his feedback was specific and kind.",
    },
  });
  await seedSession({
    customerId: emily!.id,
    mentor: david,
    offering: davidOfferings.behavioural!,
    date: pastDateOnWeekday(3, 20),
    startTime: "19:00",
    connectionMode: ConnectionMode.GOOGLE_MEET,
    review: { rating: 4, comment: "Great structure for STAR answers. Helped me tighten my stories." },
  });
  await seedSession({
    customerId: kwame!.id,
    mentor: david,
    offering: davidOfferings.coding!,
    date: pastDateOnWeekday(6, 13),
    startTime: "10:00",
    connectionMode: ConnectionMode.ZOOM,
    review: { rating: 5, comment: "Honest, actionable feedback on my problem-solving approach." },
  });
  await seedSession({
    customerId: lucia!.id,
    mentor: david,
    offering: davidOfferings.behavioural!,
    date: pastDateOnWeekday(4, 27),
    startTime: "18:00",
    connectionMode: ConnectionMode.PHONE,
    review: { rating: 4, comment: "Really useful practice for senior-level questions." },
  });
  await seedSession({
    customerId: rohan!.id,
    mentor: david,
    offering: davidOfferings.behavioural!,
    date: pastDateOnWeekday(6, 34),
    startTime: "11:00",
    connectionMode: ConnectionMode.GOOGLE_MEET,
  });

  // Camila Reyes — 2 completed, 1 reviewed (4.0).
  await seedSession({
    customerId: lucia!.id,
    mentor: camila,
    offering: camilaOfferings.validation!,
    date: pastDateOnWeekday(3, 18),
    startTime: "14:00",
    connectionMode: ConnectionMode.ZOOM,
    review: {
      rating: 4,
      comment: "Camila challenged assumptions I hadn't noticed and gave me a clear validation plan.",
    },
  });
  await seedSession({
    customerId: rohan!.id,
    mentor: camila,
    offering: camilaOfferings.officeHours!,
    date: pastDateOnWeekday(5, 26),
    startTime: "10:00",
    connectionMode: ConnectionMode.GOOGLE_MEET,
  });

  console.log("Seed complete:");
  console.log("  Mentors (10): Priya Sharma, James Carter, Aiko Tanaka (booking off), Diego Fernandez (no availability/appointments),");
  console.log("    Sofia Almeida, Arjun Nair, Nadia Haddad, David Okafor, Camila Reyes, Amara Nwosu (unrated)");
  console.log("  Customers (7): Ananya Verma, Michael Chen, Sara Ahmed (no interests), Rohan Iyer, Emily Foster, Kwame Boateng, Lucia Herrera");
  console.log("  Appointments: original 5 (2 upcoming, 2 past/completed (1 reviewed), 1 cancelled) + 18 for the additional mentors");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
