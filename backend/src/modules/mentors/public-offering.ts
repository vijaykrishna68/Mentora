import type { Prisma } from "@prisma/client";

// Public-safe offering fields — no mentor-private configuration. Shared
// between the Discover list and the single mentor profile so both expose
// the exact same offering shape.
export const PUBLIC_OFFERING_SELECT = {
  id: true,
  name: true,
  description: true,
  category: true,
  durationMinutes: true,
  price: true,
  currency: true,
  connectionModes: true,
  availabilityCategories: true,
} satisfies Prisma.OfferingSelect;

export type PublicOffering = Prisma.OfferingGetPayload<{ select: typeof PUBLIC_OFFERING_SELECT }>;

// Prisma's Decimal isn't directly JSON-serializable the way a plain number
// is (existing convention from the appointment/offering DTOs — see
// mentor-offering.service.ts) — convert here once for every public consumer.
export function toPublicOfferingDTO(offering: PublicOffering) {
  return { ...offering, price: Number(offering.price) };
}
