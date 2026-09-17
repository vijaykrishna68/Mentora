import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button, Dialog, Field, Textarea } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import { useToastStore } from "@/lib/stores/toastStore";
import { reviewFormSchema, type ReviewFormValues } from "../schemas";
import { useSubmitReview } from "../useSubmitReview";
import { StarRatingInput } from "./StarRatingInput";

interface ReviewDialogProps {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  mentorName: string;
}

/**
 * Duplicate submissions are prevented two ways: the `mutation.isPending`
 * guard below (belt-and-suspenders against a double-click beating
 * `disabled`, same pattern as BookingDialog), and — authoritatively — the
 * backend's unique constraint on Review.appointmentId, surfaced here as a
 * plain inline error if it's ever hit.
 */
export function ReviewDialog({ open, onClose, appointmentId, mentorName }: ReviewDialogProps) {
  const mutation = useSubmitReview(appointmentId);
  const pushToast = useToastStore((state) => state.push);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { rating: 0, comment: "" },
  });

  function handleClose() {
    mutation.reset();
    reset({ rating: 0, comment: "" });
    onClose();
  }

  function onSubmit(values: ReviewFormValues) {
    if (mutation.isPending) return; // belt-and-suspenders against a double-click beating `disabled`

    mutation.mutate(
      { rating: values.rating, comment: values.comment?.trim() ? values.comment.trim() : null },
      {
        onSuccess: () => {
          pushToast({ variant: "success", title: "Review submitted", description: `Thanks for reviewing ${mentorName}.` });
          handleClose();
        },
      },
    );
  }

  const errorMessage = mutation.isError
    ? isApiError(mutation.error)
      ? mutation.error.message
      : "Something went wrong. Please try again."
    : null;

  return (
    <Dialog open={open} onClose={handleClose} title="Leave a review" description={`Your session with ${mentorName}`}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold text-charcoal-2">Rating</p>
          <div className="mt-1.5">
            <Controller
              control={control}
              name="rating"
              render={({ field }) => <StarRatingInput value={field.value} onChange={field.onChange} disabled={mutation.isPending} />}
            />
          </div>
          {errors.rating && (
            <p role="alert" className="mt-1.5 text-[11.5px] font-semibold text-error">
              {errors.rating.message}
            </p>
          )}
        </div>

        <Field label="Comment (optional)" error={errors.comment?.message}>
          {(fieldProps) => <Textarea {...fieldProps} {...register("comment")} disabled={mutation.isPending} />}
        </Field>

        {errorMessage && (
          <p role="alert" className="text-[12.5px] font-semibold text-error">
            {errorMessage}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={handleClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" loading={isSubmitting || mutation.isPending} aria-busy={isSubmitting || mutation.isPending}>
            {mutation.isPending ? "Submitting…" : "Submit review"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
