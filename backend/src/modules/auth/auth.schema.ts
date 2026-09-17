import { z } from "zod";
import { Category } from "@prisma/client";

const email = z.string().trim().toLowerCase().email("Invalid email address");
const password = z.string().min(8, "Password must be at least 8 characters");
const name = z.string().trim().min(1, "Name is required").max(120);

// Role validation is structural (Zod); what happens per role (creating a
// MentorProfile, storing interests) is a service-layer business rule.
export const registerSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("CUSTOMER"),
    email,
    password,
    name,
    interests: z.array(z.enum(Category)).max(7).optional(),
  }),
  z.object({
    role: z.literal("MENTOR"),
    email,
    password,
    name,
  }),
]);

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
