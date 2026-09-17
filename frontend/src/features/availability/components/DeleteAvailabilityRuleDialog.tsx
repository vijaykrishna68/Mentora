import { Button, Dialog } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import { useToastStore } from "@/lib/stores/toastStore";
import { DAY_OF_WEEK_LABELS, type AvailabilityRule } from "@/types";
import { useDeleteAvailabilityRule } from "../useAvailabilityRuleMutations";

interface DeleteAvailabilityRuleDialogProps {
  open: boolean;
  onClose: () => void;
  rule: AvailabilityRule;
}

export function DeleteAvailabilityRuleDialog({ open, onClose, rule }: DeleteAvailabilityRuleDialogProps) {
  const mutation = useDeleteAvailabilityRule();
  const pushToast = useToastStore((state) => state.push);

  function handleClose() {
    mutation.reset();
    onClose();
  }

  function handleConfirm() {
    if (mutation.isPending) return; // belt-and-suspenders against a double-click beating `disabled`

    mutation.mutate(rule.id, {
      onSuccess: () => {
        pushToast({ variant: "success", title: "Availability rule removed" });
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
    <Dialog open={open} onClose={handleClose} title="Remove this availability rule?">
      <p className="text-sm text-charcoal-2">
        <span className="font-semibold text-charcoal">
          {DAY_OF_WEEK_LABELS[rule.dayOfWeek]}, {rule.startTime}–{rule.endTime}
        </span>{" "}
        will no longer be offered to customers as a bookable window. Existing appointments already booked in this window are unaffected.
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
          {mutation.isPending ? "Removing…" : "Remove rule"}
        </Button>
      </div>
    </Dialog>
  );
}
