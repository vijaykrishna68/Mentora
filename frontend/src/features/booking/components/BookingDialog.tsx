import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, Icon } from "@/components/ui";
import { paths } from "@/app/router/paths";
import { isApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/queryKeys";
import { useToastStore } from "@/lib/stores/toastStore";
import { formatFullDate, formatTime, getBrowserTimezone, timezonesDiffer } from "@/lib/utils/datetime";
import { CONNECTION_MODE_LABELS, type Appointment, type AvailabilitySlot, type ConnectionMode, type PublicOffering } from "@/types";
import { useCreateAppointment } from "../useCreateAppointment";

interface BookingDialogProps {
  open: boolean;
  onClose: () => void;
  mentorId: string;
  mentorName: string;
  offering: PublicOffering;
  slot: AvailabilitySlot;
  connectionMode: ConnectionMode;
  mentorTimezone: string;
  /** The stale slot must be cleared and the user returned to the slot picker — handled by the caller. */
  onConflict: () => void;
  /** So the caller can clear the now-booked slot/date — a successful booking must never leave a stale slot selectable. */
  onBookingSuccess: () => void;
}

/**
 * Single modal that carries the flow through review → processing →
 * success. A 409 (someone else took the slot) closes the modal and hands
 * control back to the slot picker rather than trying to resolve it here —
 * see the conflict-specific toast in handleConfirm.
 */
export function BookingDialog({
  open,
  onClose,
  mentorId,
  mentorName,
  offering,
  slot,
  connectionMode,
  mentorTimezone,
  onConflict,
  onBookingSuccess,
}: BookingDialogProps) {
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const mutation = useCreateAppointment(mentorId);
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  const customerTimezone = getBrowserTimezone();
  const showMentorTime = timezonesDiffer(slot.startAt, customerTimezone, mentorTimezone);

  // Every exit path (backdrop, Escape, Back, the two success actions) goes
  // through this, so the next open always starts back at the review step —
  // no effect needed to sync state to `open`.
  function handleClose() {
    setConfirmedAppointment(null);
    mutation.reset();
    onClose();
  }

  function handleConfirm() {
    if (mutation.isPending) return; // belt-and-suspenders against a double-click beating `disabled`

    mutation.mutate(
      { mentorId, offeringId: offering.id, startAt: slot.startAt, connectionMode },
      {
        onSuccess: (result) => {
          setConfirmedAppointment(result.appointment);
          onBookingSuccess();
        },
        onError: (error) => {
          if (isApiError(error) && error.status === 409) {
            pushToast({
              variant: "error",
              title: "That slot was just booked.",
              description: `${formatTime(slot.startAt, customerTimezone)} is no longer available. Choose another time to continue.`,
            });
            onConflict();
            handleClose();
            return;
          }
          if (isApiError(error) && error.status === 401) {
            pushToast({ variant: "error", title: "Your session expired", description: "Please sign in again to continue." });
            queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
            handleClose();
          }
          // Every other error (400/403/404/500) renders inline below — see errorMessage.
        },
      },
    );
  }

  const errorMessage = (() => {
    if (!mutation.isError) return null;
    if (!isApiError(mutation.error)) return "Something went wrong. Please try again.";
    if (mutation.error.status === 409 || mutation.error.status === 401) return null; // handled above (toast + close)
    return mutation.error.message;
  })();

  if (confirmedAppointment) {
    return (
      <Dialog open={open} onClose={handleClose} title="Booking confirmed">
        <div className="text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-success-tint text-2xl text-success">
            <Icon name="check" />
          </span>
          <p className="mt-3 text-sm text-charcoal-2">
            Your session with <span className="font-semibold text-charcoal">{mentorName}</span> is booked.
          </p>

          <div className="mt-4 rounded-sm border border-line bg-ivory p-3 text-left text-[13px]">
            <p className="font-semibold text-charcoal">{formatFullDate(confirmedAppointment.startAt, customerTimezone)}</p>
            <p className="mt-1 text-charcoal-muted">
              {formatTime(confirmedAppointment.startAt, customerTimezone)} · {confirmedAppointment.offeringSnapshot.durationMinutes} min
            </p>
            <p className="mt-1 text-charcoal-muted">{CONNECTION_MODE_LABELS[confirmedAppointment.connectionMode]}</p>
            {confirmedAppointment.connectionDetail && (
              <p className="mt-1 text-charcoal-muted">Call: {confirmedAppointment.connectionDetail}</p>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link to={paths.appointments} className="flex-1">
              <Button variant="secondary" className="w-full" onClick={handleClose}>
                View appointment
              </Button>
            </Link>
            <Link to={paths.discover} className="flex-1">
              <Button className="w-full" onClick={handleClose}>
                Back to Discover
              </Button>
            </Link>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Confirm your session">
      <p className="text-sm text-charcoal-2">
        <span className="font-serif text-base font-semibold text-charcoal">{mentorName}</span>
        <span className="mx-1.5 text-charcoal-faint">·</span>
        <span>{offering.name}</span>
      </p>

      <div className="mt-4 rounded-sm border border-line bg-ivory p-3">
        <p className="text-sm font-semibold text-charcoal">{formatFullDate(slot.startAt, customerTimezone)}</p>

        <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-line pt-2">
          <span className="flex-none text-xs text-charcoal-muted">Your time</span>
          <span className="text-right text-[12.5px] font-semibold tabular-nums text-charcoal">{formatTime(slot.startAt, customerTimezone)}</span>
        </div>
        {showMentorTime && (
          <div className="flex items-baseline justify-between gap-2 pt-1.5">
            <span className="flex-none text-xs text-charcoal-muted">Mentor's time</span>
            <span className="text-right text-[12.5px] font-semibold tabular-nums text-charcoal">
              {formatTime(slot.startAt, mentorTimezone)} · {mentorTimezone}
            </span>
          </div>
        )}

        <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-line pt-2 text-[12.5px]">
          <span className="text-charcoal-muted">
            {offering.durationMinutes} min · {CONNECTION_MODE_LABELS[connectionMode]}
          </span>
          <span className="font-bold tabular-nums text-charcoal">
            {offering.currency} {offering.price}
          </span>
        </div>
      </div>

      {errorMessage && (
        <p role="alert" className="mt-3 text-[12.5px] font-semibold text-error">
          {errorMessage}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={handleClose} disabled={mutation.isPending}>
          Back
        </Button>
        <Button className="flex-1" onClick={handleConfirm} loading={mutation.isPending} aria-busy={mutation.isPending}>
          {mutation.isPending ? "Booking…" : "Confirm booking"}
        </Button>
      </div>
    </Dialog>
  );
}
