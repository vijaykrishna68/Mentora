import { Card, Switch } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import { useToastStore } from "@/lib/stores/toastStore";
import type { MentorReadiness } from "@/types";
import { useUpdateMentorProfile } from "../useUpdateMentorProfile";

interface AcceptingBookingsToggleProps {
  acceptingBookings: boolean;
  readiness: MentorReadiness;
}

/**
 * Turning this off only stops NEW bookings — it never touches existing
 * appointments (the backend doesn't either; this is purely the
 * `acceptingBookings` column). Turning it on is gated by the backend's own
 * readiness check (`readyExcludingAcceptingBookings`), never guessed here —
 * a 400 ONBOARDING_INCOMPLETE surfaces the backend's own reasons verbatim.
 */
export function AcceptingBookingsToggle({ acceptingBookings, readiness }: AcceptingBookingsToggleProps) {
  const mutation = useUpdateMentorProfile();
  const pushToast = useToastStore((state) => state.push);

  function handleToggle(next: boolean) {
    mutation.mutate(
      { acceptingBookings: next },
      {
        onSuccess: () => {
          pushToast({
            variant: "success",
            title: next ? "You're now accepting bookings" : "Bookings paused",
            description: next
              ? "Customers can book new sessions with you."
              : "Customers can't book new sessions. Your existing appointments are unaffected.",
          });
        },
      },
    );
  }

  const blockedFromEnabling = !acceptingBookings && !readiness.readyExcludingAcceptingBookings;
  const errorMessage = mutation.isError
    ? isApiError(mutation.error)
      ? mutation.error.message
      : "Something went wrong. Please try again."
    : null;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <Switch
          label="Accepting bookings"
          className="font-bold text-charcoal"
          checked={acceptingBookings}
          disabled={mutation.isPending || blockedFromEnabling}
          onChange={(event) => handleToggle(event.target.checked)}
        />
      </div>
      <p className="mt-2 max-w-md text-[12.5px] text-charcoal-muted">
        Turning this off only stops new bookings — your existing appointments stay exactly as they are.
      </p>
      {blockedFromEnabling && (
        <p className="mt-1.5 text-[12.5px] font-semibold text-warning">Finish the checklist above before turning this on.</p>
      )}
      {errorMessage && (
        <p role="alert" className="mt-2 text-[12.5px] font-semibold text-error">
          {errorMessage}
        </p>
      )}
    </Card>
  );
}
