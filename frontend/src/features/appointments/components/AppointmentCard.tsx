import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, Badge, Button, Icon, type IconName } from "@/components/ui";
import { paths } from "@/app/router/paths";
import { formatFullDate, formatTime, getBrowserTimezone, timezonesDiffer } from "@/lib/utils/datetime";
import {
  APPOINTMENT_STATUS_LABELS,
  CONNECTION_MODE_LABELS,
  type ConnectionMode,
  type CustomerAppointmentListItem,
} from "@/types";
import { CancelAppointmentDialog } from "./CancelAppointmentDialog";
import { ReviewDialog } from "./ReviewDialog";

const CONNECTION_MODE_ICON: Record<ConnectionMode, IconName> = {
  GOOGLE_MEET: "video",
  ZOOM: "video",
  PHONE: "phone",
  IN_PERSON: "map-pin",
};

const STATUS_BADGE_VARIANT: Record<CustomerAppointmentListItem["status"], "sage" | "neutral" | "error"> = {
  CONFIRMED: "sage",
  COMPLETED: "neutral",
  CANCELLED: "error",
};

function ReviewStars({ rating }: { rating: number }) {
  return (
    <span aria-label={`Rated ${rating} out of 5`} className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon key={star} name="star" className={star <= rating ? "text-accent" : "text-charcoal-faint"} />
      ))}
    </span>
  );
}

export function AppointmentCard({ appointment }: { appointment: CustomerAppointmentListItem }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const customerTimezone = getBrowserTimezone();
  const showMentorTime = timezonesDiffer(appointment.startAt, customerTimezone, appointment.mentorTimezone);
  const snapshot = appointment.offeringSnapshot;

  return (
    <li className="rounded-md border-[length:var(--b-hair)] border-line bg-ivory-raised p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={appointment.mentor.avatarUrl} name={appointment.mentor.name} />
          <div>
            <Link
              to={paths.mentorProfile(appointment.mentor.id)}
              className="font-serif text-base font-semibold text-charcoal hover:underline"
            >
              {appointment.mentor.name}
            </Link>
            <p className="text-[12.5px] text-charcoal-muted">{snapshot.name}</p>
          </div>
        </div>
        <Badge variant={STATUS_BADGE_VARIANT[appointment.status]}>{APPOINTMENT_STATUS_LABELS[appointment.status]}</Badge>
      </div>

      <div className="mt-4 rounded-sm border border-line bg-ivory p-3">
        <p className="text-sm font-semibold text-charcoal">{formatFullDate(appointment.startAt, customerTimezone)}</p>

        <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-line pt-2">
          <span className="flex-none text-xs text-charcoal-muted">Your time</span>
          <span className="text-right text-[12.5px] font-semibold tabular-nums text-charcoal">
            {formatTime(appointment.startAt, customerTimezone)}
          </span>
        </div>
        {showMentorTime && (
          <div className="flex items-baseline justify-between gap-2 pt-1.5">
            <span className="flex-none text-xs text-charcoal-muted">Mentor's time</span>
            <span className="text-right text-[12.5px] font-semibold tabular-nums text-charcoal">
              {formatTime(appointment.startAt, appointment.mentorTimezone)} · {appointment.mentorTimezone}
            </span>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-[12.5px]">
          <span className="inline-flex items-center gap-1.5 text-charcoal-2">
            <Icon name={CONNECTION_MODE_ICON[appointment.connectionMode]} />
            {snapshot.durationMinutes} min · {CONNECTION_MODE_LABELS[appointment.connectionMode]}
          </span>
          <span className="font-bold tabular-nums text-charcoal">
            {snapshot.currency} {snapshot.price}
          </span>
        </div>
        {appointment.connectionDetail && (
          <p className="mt-1.5 text-[12.5px] text-charcoal-muted">Call: {appointment.connectionDetail}</p>
        )}
      </div>

      {appointment.review && (
        <div className="mt-3 rounded-sm border border-line bg-ivory p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-charcoal-2">Your review</p>
            <ReviewStars rating={appointment.review.rating} />
          </div>
          {appointment.review.comment && <p className="mt-1.5 text-[13px] text-charcoal-2">{appointment.review.comment}</p>}
        </div>
      )}

      {(appointment.status === "CONFIRMED" || appointment.canReview) && (
        <div className="mt-4 flex gap-2">
          {appointment.status === "CONFIRMED" && (
            <Button variant="secondary" size="sm" onClick={() => setCancelOpen(true)}>
              Cancel session
            </Button>
          )}
          {appointment.canReview && (
            <Button variant="secondary" size="sm" onClick={() => setReviewOpen(true)}>
              Leave a review
            </Button>
          )}
        </div>
      )}

      <CancelAppointmentDialog open={cancelOpen} onClose={() => setCancelOpen(false)} appointment={appointment} />
      <ReviewDialog open={reviewOpen} onClose={() => setReviewOpen(false)} appointmentId={appointment.id} mentorName={appointment.mentor.name} />
    </li>
  );
}
