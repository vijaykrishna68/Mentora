import { Button, Dialog } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import { useToastStore } from "@/lib/stores/toastStore";
import type { ExperienceEntry } from "@/types";
import { useDeleteExperience } from "../useExperienceMutations";

interface DeleteExperienceDialogProps {
  open: boolean;
  onClose: () => void;
  entry: ExperienceEntry;
}

export function DeleteExperienceDialog({ open, onClose, entry }: DeleteExperienceDialogProps) {
  const mutation = useDeleteExperience();
  const pushToast = useToastStore((state) => state.push);

  function handleClose() {
    mutation.reset();
    onClose();
  }

  function handleConfirm() {
    if (mutation.isPending) return; // belt-and-suspenders against a double-click beating `disabled`

    mutation.mutate(entry.id, {
      onSuccess: () => {
        pushToast({ variant: "success", title: "Experience removed" });
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
    <Dialog open={open} onClose={handleClose} title="Remove this experience entry?">
      <p className="text-sm text-charcoal-2">
        <span className="font-semibold text-charcoal">
          {entry.role} at {entry.organization}
        </span>{" "}
        will be permanently removed from your profile. This cannot be undone.
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
          {mutation.isPending ? "Removing…" : "Remove"}
        </Button>
      </div>
    </Dialog>
  );
}
