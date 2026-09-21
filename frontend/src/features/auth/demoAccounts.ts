import type { Role } from "@/types";
import type { LoginInput } from "./schemas";

// Public, intentionally shared demo accounts created by backend/prisma/seed.ts
// (also listed in the README). Not secrets — they only exist so a reviewer can
// enter the app through the normal login API without creating an account.
const DEMO_PASSWORD = "MentoraDemo123!";

export const DEMO_ACCOUNTS: Record<Role, LoginInput> = {
  CUSTOMER: { email: "ananya.verma@mentora.dev", password: DEMO_PASSWORD },
  MENTOR: { email: "priya.sharma@mentora.dev", password: DEMO_PASSWORD },
};

export const DEMO_NOTICE = "Demo account · Changes may be shared with other visitors.";
