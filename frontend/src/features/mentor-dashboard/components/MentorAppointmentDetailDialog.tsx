import type { ReactNode } from "react";
import { Badge, Dialog, Icon, type IconName } from "@/components/ui";
import { formatFullDate, formatTime } from "@/lib/utils/datetime";
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

interface MentorAppointmentDetailDialogProps {
  appointment: MentorAppointmentListItem | null;
  onClose: () => void;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-line py-2 text-[13px] first:border-t-0 first:pt-0">
      <span className="flex-none text-charcoal-muted">{label}</span>
      <span className="text-right font-semibold text-charcoal">{children}</span>
    </div>
  );
}

/**
 * Every value here comes straight from the appointment DTO/offeringSnapshot
 * — no re-fetch of the customer, the offering, or the mentor profile. Time
 * is rendered in the appointment's stored mentorTimezone (the scheduling
 * source of truth), never the viewing browser's timezone.
 */
export function MentorAppointmentDetailDialog({ appointment, onClose }: MentorAppointmentDetailDialogProps) {
  if (!appointment) return null;

  const snapshot = appointment.offeringSnapshot;
  const detailText = connectionDetailText(appointment.connectionMode, appointment.connectionDetail);

  return (
    <Dialog open={Boolean(appointment)} onClose={onClose} title="Appointment details" description={appointment.customer.name}>
      <div className="rounded-sm border border-line bg-ivory p-3">
        <Row label="Offering">{snapshot.name}</Row>
        <Row label="Duration">{snapshot.durationMinutes} min</Row>
        <Row label="Price">
          {snapshot.currency} {snapshot.price}
        </Row>
        <Row label="Date">{formatFullDate(appointment.startAt, appointment.mentorTimezone)}</Row>
        <Row label="Your time">{formatTime(appointment.startAt, appointment.mentorTimezone)}</Row>
        <Row label="Your timezone">{appointment.mentorTimezone}</Row>
        <Row label="Connection">
          <span className="inline-flex items-center gap-1.5">
            <Icon name={CONNECTION_MODE_ICON[appointment.connectionMode]} />
            {CONNECTION_MODE_LABELS[appointment.connectionMode]}
          </span>
        </Row>
        {detailText && <Row label="Details">{detailText}</Row>}
        <Row label="Status">
          <Badge variant={STATUS_BADGE_VARIANT[appointment.status]}>{APPOINTMENT_STATUS_LABELS[appointment.status]}</Badge>
        </Row>
      </div>
    </Dialog>
  );
}
