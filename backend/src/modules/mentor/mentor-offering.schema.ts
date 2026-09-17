import { z } from "zod";
import { Category, ConnectionMode, AvailabilityCategory } from "@prisma/client";

export const createOfferingSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  category: z.enum(Category),
  // Sensible bounds for a mentoring session — not an arbitrary-length event.
  durationMinutes: z
    .number()
    .int()
    .min(15, "Minimum session length is 15 minutes")
    .max(240, "Maximum session length is 240 minutes"),
  price: z.number().min(0, "Price cannot be negative"),
  currency: z
    .string()
    .trim()
    .length(3, "Use a 3-letter currency code, e.g. INR")
    .toUpperCase()
    .default("INR"),
  connectionModes: z.array(z.enum(ConnectionMode)).min(1, "Select at least one connection mode"),
  availabilityCategories: z
    .array(z.enum(AvailabilityCategory))
    .min(1, "Select at least one availability category"),
  isActive: z.boolean().optional(),
});

export type CreateOfferingInput = z.infer<typeof createOfferingSchema>;

export const updateOfferingSchema = createOfferingSchema.partial().strict();

export type UpdateOfferingInput = z.infer<typeof updateOfferingSchema>;
