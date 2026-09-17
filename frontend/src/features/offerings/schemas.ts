import { z } from "zod";

// Mirrors backend/src/modules/mentor/mentor-offering.schema.ts. Categories
// (topic) and availabilityCategories (time-of-day) are deliberately separate
// arrays — never conflated, and duration never implies an availability
// category.
export const offeringFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(2000, "Keep it under 2000 characters").optional(),
  category: z.string().min(1, "Choose a category"),
  durationMinutes: z
    .number()
    .int("Duration must be a whole number")
    .min(15, "Minimum session length is 15 minutes")
    .max(240, "Maximum session length is 240 minutes"),
  price: z.number().min(0, "Price cannot be negative"),
  currency: z.string().trim().length(3, "Use a 3-letter currency code, e.g. INR"),
  connectionModes: z.array(z.string()).min(1, "Select at least one connection mode"),
  availabilityCategories: z.array(z.string()).min(1, "Select at least one availability category"),
  isActive: z.boolean().optional(),
});
export type OfferingFormValues = z.infer<typeof offeringFormSchema>;
