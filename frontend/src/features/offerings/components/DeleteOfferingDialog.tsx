import { Button, Dialog } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import { useToastStore } from "@/lib/stores/toastStore";
import type { Offering } from "@/types";
import { useDeleteOffering } from "../useOfferingMutations";

interface DeleteOfferingDialogProps {
  open: boolean;
  onClose: () => void;
  offering: Offering;
}

/**
 * The backend decides — never this component — whether the offering is hard
 * deleted (never booked) or archived (has existing appointments, which keep
 * their own offeringSnapshot regardless). The confirmation copy explains
 * both possible outcomes upfront since we can't know which applies until
 * the backend responds.
 */
export function DeleteOfferingDialog({ open, onClose, offering }: DeleteOfferingDialogProps) {
  const mutation = useDeleteOffering();
  const pushToast = useToastStore((state) => state.push);

  function handleClose() {
    mutation.reset();
    onClose();
  }

  function handleConfirm() {
    if (mutation.isPending) return; // belt-and-suspenders against a double-click beating `disabled`

    mutation.mutate(offering.id, {
      onSuccess: (result) => {
        pushToast({
          variant: "success",
          title: result.deleted ? "Offering deleted" : "Offering archived",
          description: result.deleted
            ? "It had no bookings, so it was removed entirely."
            : "It has existing bookings, so it was archived instead — customers can no longer book it, and past appointments are unaffected.",
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
    <Dialog open={open} onClose={handleClose} title="Remove this offering?">
      <p className="text-sm text-charcoal-2">
        <span className="font-semibold text-charcoal">{offering.name}</span> will no longer be bookable. If it's never been booked it will
        be deleted entirely; if it has existing appointments it will be archived instead — those appointments keep their own record of it
        and are unaffected either way.
      </p>

      {errorMessage && (
        <p role="alert" className="mt-3 text-[12.5px] font-semibold text-error">
          {errorMessage}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={handleClose} disabled={mutation.isPending}>
          Keep it
        </Button>
        <Button className="flex-1" onClick={handleConfirm} loading={mutation.isPending} aria-busy={mutation.isPending}>
          {mutation.isPending ? "Removing…" : "Remove offering"}
        </Button>
      </div>
    </Dialog>
  );
}
