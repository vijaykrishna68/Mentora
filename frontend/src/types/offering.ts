import type { AvailabilityCategory, Category, ConnectionMode } from "./enums";

/** Public-safe offering shape (public-offering.ts `toPublicOfferingDTO`). */
export interface PublicOffering {
  id: string;
  name: string;
  description: string | null;
  category: Category;
  durationMinutes: number;
  price: number;
  currency: string;
  connectionModes: ConnectionMode[];
  availabilityCategories: AvailabilityCategory[];
}

/** Full offering as returned/managed by its owning mentor. */
export interface Offering extends PublicOffering {
  mentorProfileId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Snapshot of an offering captured at booking time (Appointment.offeringSnapshot). */
export interface OfferingSnapshot {
  name: string;
  durationMinutes: number;
  price: number;
  currency: string;
}
