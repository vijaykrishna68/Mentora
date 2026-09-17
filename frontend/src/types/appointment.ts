import type { AppointmentStatus, ConnectionMode } from "./enums";
import type { OfferingSnapshot } from "./offering";
import type { AppointmentReview } from "./review";

/** appointment.dto.ts `toAppointmentDTO` — the create/cancel response shape. */
export interface Appointment {
  id: string;
  mentorId: string;
  offeringId: string;
  customerId: string;
  /** UTC ISO instant. Convert to the viewer's local timezone for display, never treat as local. */
  startAt: string;
  /** UTC ISO instant. */
  endAt: string;
  status: AppointmentStatus;
  connectionMode: ConnectionMode;
  /** Mentor's phone number for PHONE bookings, booking-time snapshot; null otherwise. */
  connectionDetail: string | null;
  /** IANA timezone, snapshotted at booking time — use to show "mentor's time". */
  mentorTimezone: string;
  offeringSnapshot: OfferingSnapshot;
  createdAt: string;
  updatedAt: string;
}

/**
 * POST /api/appointments request body (appointment.schema.ts `createAppointmentSchema`,
 * `.strict()` — the backend rejects any other field outright). The backend derives
 * endAt/price/duration/currency/timezone itself; the client never sends them.
 */
export interface CreateAppointmentInput {
  mentorId: string;
  offeringId: string;
  /** UTC ISO instant (not a mentor-local wall-clock string). */
  startAt: string;
  connectionMode: ConnectionMode;
}

/** GET /api/appointments list item (customer's own view — mentor identity attached). */
export interface CustomerAppointmentListItem {
  id: string;
  mentor: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  offeringId: string;
  startAt: string;
  endAt: string;
  mentorTimezone: string;
  connectionMode: ConnectionMode;
  connectionDetail: string | null;
  offeringSnapshot: OfferingSnapshot;
  status: AppointmentStatus;
  canReview: boolean;
  review: AppointmentReview | null;
  createdAt: string;
}

/** GET /api/appointments response (appointment.service.ts `listMyAppointments`). */
export interface CustomerAppointmentsResponse {
  upcoming: CustomerAppointmentListItem[];
  past: CustomerAppointmentListItem[];
}

/** GET /api/mentor/appointments list item (mentor's own view — customer identity attached). */
export interface MentorAppointmentListItem {
  id: string;
  customer: {
    id: string;
    name: string;
  };
  offeringId: string;
  startAt: string;
  endAt: string;
  mentorTimezone: string;
  connectionMode: ConnectionMode;
  connectionDetail: string | null;
  offeringSnapshot: OfferingSnapshot;
  status: AppointmentStatus;
  review: AppointmentReview | null;
  createdAt: string;
}

/** GET /api/mentor/appointments response (mentor-appointments.service.ts `listMentorAppointments`). */
export interface MentorAppointmentsResponse {
  upcoming: MentorAppointmentListItem[];
  past: MentorAppointmentListItem[];
}
