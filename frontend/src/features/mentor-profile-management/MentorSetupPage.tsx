import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button, Card, ErrorState, Skeleton } from "@/components/ui";
import { paths } from "@/app/router/paths";
import { isApiError } from "@/lib/api/errors";
import { AcceptingBookingsToggle } from "./components/AcceptingBookingsToggle";
import { ReadinessChecklist } from "./components/ReadinessChecklist";
import { useMyMentorProfile } from "./useMyMentorProfile";

function SetupStepCard({ title, done, description, to, cta }: { title: string; done: boolean; description: string; to: string; cta: string }) {
  return (
    <Card className="flex items-center justify-between gap-4 p-4 sm:p-5">
      <div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className={done ? "h-[7px] w-[7px] rounded-full bg-success" : "h-[7px] w-[7px] rounded-full bg-charcoal-faint"} />
          <p className="text-sm font-bold text-charcoal">{title}</p>
        </div>
        <p className="mt-1 text-[12.5px] text-charcoal-muted">{description}</p>
      </div>
      <Link to={to} className="flex-none">
        <Button type="button" variant="secondary" size="sm">
          {cta}
        </Button>
      </Link>
    </Card>
  );
}

function SetupSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-8 w-64" />
      <Skeleton className="mt-4 h-40 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

function Page({ children }: { children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal-faint">Setup</p>
      <h1 className="mt-1.5 font-serif text-[26px] font-semibold text-charcoal">Get set up on Mentora</h1>
      <p className="mt-1.5 max-w-lg text-sm text-charcoal-muted">
        Complete each step below to become bookable. You can save progress and come back anytime.
      </p>
      <div className="mt-6 flex flex-col gap-4">{children}</div>
    </div>
  );
}

/**
 * A hub, not a wizard: each step links out to the page that actually edits
 * that data (Profile / Offerings / Availability), so there's exactly one
 * place each thing is edited. Status per step comes straight from the
 * backend's own MentorReadiness — never recomputed here.
 */
export function MentorSetupPage() {
  const { data, isPending, isError, error, refetch } = useMyMentorProfile();

  if (isPending) {
    return (
      <Page>
        <SetupSkeleton />
      </Page>
    );
  }

  if (isError) {
    return (
      <Page>
        <ErrorState
          title="Couldn't load your setup progress"
          description={isApiError(error) ? error.message : "Something went wrong. Please try again."}
          onRetry={() => refetch()}
        />
      </Page>
    );
  }

  const { profile, readiness } = data;

  return (
    <Page>
      <ReadinessChecklist readiness={readiness} />

      <SetupStepCard
        title="Profile"
        done={readiness.hasRequiredProfileInfo && readiness.hasTimezone}
        description="Headline, bio, timezone, and how customers can reach you."
        to={paths.mentorProfileSettings}
        cta="Edit profile"
      />
      <SetupStepCard
        title="Offerings"
        done={readiness.hasActiveOffering}
        description="At least one active session customers can book."
        to={paths.mentorOfferings}
        cta="Manage offerings"
      />
      <SetupStepCard
        title="Availability"
        done={readiness.hasActiveAvailabilityRule}
        description="Recurring weekly hours you're available for sessions."
        to={paths.mentorAvailability}
        cta="Manage availability"
      />

      <AcceptingBookingsToggle acceptingBookings={profile.acceptingBookings} readiness={readiness} />
    </Page>
  );
}
