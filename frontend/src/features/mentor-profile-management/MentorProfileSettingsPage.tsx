import { ErrorState, Skeleton } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import { AcceptingBookingsToggle } from "./components/AcceptingBookingsToggle";
import { ExperienceManager } from "./components/ExperienceManager";
import { MentorProfileForm } from "./components/MentorProfileForm";
import { useMyMentorProfile } from "./useMyMentorProfile";

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-8 w-48" />
      <Skeleton className="mt-4 h-48 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export function MentorProfileSettingsPage() {
  const { data, isPending, isError, error, refetch } = useMyMentorProfile();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal-faint">Settings</p>
      <h1 className="mt-1.5 font-serif text-[26px] font-semibold text-charcoal">Profile</h1>
      <p className="mt-1.5 max-w-lg text-sm text-charcoal-muted">
        This is what customers see on Discover and your public profile.
      </p>

      <div className="mt-6">
        {isPending && <ProfileSkeleton />}

        {isError && (
          <ErrorState
            title="Couldn't load your profile"
            description={isApiError(error) ? error.message : "Something went wrong. Please try again."}
            onRetry={() => refetch()}
          />
        )}

        {!isPending && !isError && (
          <div className="flex flex-col gap-5">
            <MentorProfileForm key={data.profile.updatedAt} profile={data.profile} />
            <ExperienceManager entries={data.experienceEntries} />
            <AcceptingBookingsToggle acceptingBookings={data.profile.acceptingBookings} readiness={data.readiness} />
          </div>
        )}
      </div>
    </div>
  );
}
