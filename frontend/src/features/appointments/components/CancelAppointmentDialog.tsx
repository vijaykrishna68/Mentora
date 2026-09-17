import { Button, Dialog } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import { useToastStore } from "@/lib/stores/toastStore";
import { formatFullDate, formatTime, getBrowserTimezone } from "@/lib/utils/datetime";
import type { CustomerAppointmentListItem } from "@/types";
import { useCancelAppointment } from "../useCancelAppointment";

interface CancelAppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  appointment: CustomerAppointmentListItem;
}

/**
 * The 24-hour cancellation deadline and every other eligibility rule
 * (already cancelled, already completed) are enforced only by the backend —
 * this dialog just calls the cancel endpoint and renders whatever it says,
 * rather than re-deriving the deadline client-side.
 */
export function CancelAppointmentDialog({ open, onClose, appointment }: CancelAppointmentDialogProps) {
  const mutation = useCancelAppointment();
  const pushToast = useToastStore((state) => state.push);
  const customerTimezone = getBrowserTimezone();

  function handleClose() {
    mutation.reset();
    onClose();
  }

  function handleConfirm() {
    if (mutation.isPending) return; // belt-and-suspenders against a double-click beating `disabled`

    mutation.mutate(appointment.id, {
      onSuccess: () => {
        pushToast({
          variant: "success",
          title: "Appointment cancelled",
          description: `Your session with ${appointment.mentor.name} has been cancelled.`,
        });
        handleClose();
      },
    });
  }

  const errorMessage = mutation.isError
    ? isApiError(mutation.error)
      ? mutation.error.message
      : "Something went wrong. Please try again."
    : null;

  return (
    <Dialog open={open} onClose={handleClose} title="Cancel this session?">
      <p className="text-sm text-charcoal-2">
        Your session with <span className="font-semibold text-charcoal">{appointment.mentor.name}</span> on{" "}
        <span className="font-semibold text-charcoal">{formatFullDate(appointment.startAt, customerTimezone)}</span> at{" "}
        <span className="font-semibold text-charcoal">{formatTime(appointment.startAt, customerTimezone)}</span> will be cancelled. This
        cannot be undone.
      </p>

      {errorMessage && (
        <p role="alert" className="mt-3 text-[12.5px] font-semibold text-error">
          {errorMessage}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={handleClose} disabled={mutation.isPending}>
          Keep appointment
        </Button>
        <Button className="flex-1" onClick={handleConfirm} loading={mutation.isPending} aria-busy={mutation.isPending}>
          {mutation.isPending ? "Cancelling…" : "Cancel session"}
        </Button>
      </div>
    </Dialog>
  );
}
