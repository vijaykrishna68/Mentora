import { Avatar, Badge, Button, Icon, type IconName } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/utils/datetime";
import {
  APPOINTMENT_STATUS_LABELS,
  CONNECTION_MODE_LABELS,
  type ConnectionMode,
  type MentorAppointmentListItem,
} from "@/types";
import { connectionDetailText } from "./connectionDetailText";

const CONNECTION_MODE_ICON: Record<ConnectionMode, IconName> = {
  GOOGLE_MEET: "video",
  ZOOM: "video",
  PHONE: "phone",
  IN_PERSON: "map-pin",
};

const STATUS_BADGE_VARIANT: Record<MentorAppointmentListItem["status"], "sage" | "neutral" | "error"> = {
  CONFIRMED: "sage",
  COMPLETED: "neutral",
  CANCELLED: "error",
};

interface MentorAppointmentCardProps {
  appointment: MentorAppointmentListItem;
  onViewDetails: () => void;
}

/**
 * Time is shown in the appointment's stored `mentorTimezone` — the
 * scheduling source of truth — never the viewing browser's timezone, which
 * could differ if the mentor is travelling.
 */
export function MentorAppointmentCard({ appointment, onViewDetails }: MentorAppointmentCardProps) {
  const snapshot = appointment.offeringSnapshot;
  const detailText = connectionDetailText(appointment.connectionMode, appointment.connectionDetail);

  return (
    <li className="rounded-md border-[length:var(--b-hair)] border-line bg-ivory-raised p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={appointment.customer.name} />
          <div>
            <p className="font-serif text-base font-semibold text-charcoal">{appointment.customer.name}</p>
            <p className="text-[12.5px] text-charcoal-muted">{snapshot.name}</p>
          </div>
        </div>
        <Badge variant={STATUS_BADGE_VARIANT[appointment.status]}>{APPOINTMENT_STATUS_LABELS[appointment.status]}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-charcoal-2">
        <span className="font-semibold text-charcoal">{formatDate(appointment.startAt, appointment.mentorTimezone)}</span>
        <span className="tabular-nums">{formatTime(appointment.startAt, appointment.mentorTimezone)}</span>
        <span className="inline-flex items-center gap-1.5">
          <Icon name={CONNECTION_MODE_ICON[appointment.connectionMode]} />
          {snapshot.durationMinutes} min · {CONNECTION_MODE_LABELS[appointment.connectionMode]}
        </span>
      </div>
      {detailText && <p className="mt-1 text-[12.5px] text-charcoal-muted">{detailText}</p>}

      <div className="mt-3">
        <Button variant="secondary" size="sm" onClick={onViewDetails}>
          View details
        </Button>
      </div>
    </li>
  );
}
