import { z } from "zod";
import { CATEGORIES } from "@/types";

// Mirrors backend/src/modules/auth/auth.schema.ts. Frontend validation is
// for UX only — the backend remains authoritative and re-validates
// everything (03c §20/§35).
const email = z.string().trim().toLowerCase().email("Enter a valid email address");
const password = z.string().min(8, "Password must be at least 8 characters");
const name = z.string().trim().min(1, "Name is required").max(120);

export const customerRegisterSchema = z.object({
  role: z.literal("CUSTOMER"),
  email,
  password,
  name,
  interests: z.array(z.enum(CATEGORIES)).max(7).optional(),
});

export const mentorRegisterSchema = z.object({
  role: z.literal("MENTOR"),
  email,
  password,
  name,
});

export const registerSchema = z.discriminatedUnion("role", [customerRegisterSchema, mentorRegisterSchema]);
export type RegisterInput = z.infer<typeof registerSchema>;

// A flat schema for the signup form itself (role picked via a UI toggle,
// not a discriminated union) — the submit handler narrows into RegisterInput.
export const registerFormSchema = z.object({
  role: z.enum(["CUSTOMER", "MENTOR"]),
  email,
  password,
  name,
});
export type RegisterFormValues = z.infer<typeof registerFormSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;
