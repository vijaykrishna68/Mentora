import type { AvailabilityCategory, Category, ConnectionMode } from "./enums";
import type { MentorReadiness } from "./mentor";

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

/** POST /api/mentor/offerings request body (mentor-offering.schema.ts `createOfferingSchema`). */
export interface CreateOfferingInput {
  name: string;
  description?: string | null;
  category: Category;
  durationMinutes: number;
  price: number;
  currency?: string;
  connectionModes: ConnectionMode[];
  availabilityCategories: AvailabilityCategory[];
  isActive?: boolean;
}

/** PATCH /api/mentor/offerings/:id request body — every field optional. */
export type UpdateOfferingInput = Partial<CreateOfferingInput>;

/** POST/PATCH /api/mentor/offerings(/:id) response. */
export interface OfferingMutationResponse {
  offering: Offering;
  readiness: MentorReadiness;
}

/**
 * DELETE /api/mentor/offerings/:id response. `deleted`/`archived` are
 * mutually exclusive and decided entirely by the backend (hard delete only
 * when the offering has never been booked, archive otherwise) — the
 * frontend never predicts which one will happen.
 */
export interface DeleteOfferingResponse {
  deleted: boolean;
  archived: boolean;
  offering: Offering | null;
  readiness: MentorReadiness;
}
