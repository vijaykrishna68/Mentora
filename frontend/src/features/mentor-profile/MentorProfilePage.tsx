import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, EmptyState, ErrorState, Icon, SectionHeading, type IconName } from "@/components/ui";
import { paths } from "@/app/router/paths";
import { isApiError } from "@/lib/api/errors";
import { countryFlagEmoji } from "@/lib/utils/countryFlag";
import { CATEGORY_LABELS, CONNECTION_MODE_LABELS, type ConnectionMode } from "@/types";
import { BookingPanel } from "@/features/booking/components/BookingPanel";
import { ExperienceTimeline } from "./components/ExperienceTimeline";
import { OfferingList } from "./components/OfferingList";
import { ProfileSkeleton } from "./components/ProfileSkeleton";
import { useMentorProfile } from "./useMentorProfile";

const CONNECTION_MODE_ICON: Record<ConnectionMode, IconName> = {
  GOOGLE_MEET: "video",
  ZOOM: "video",
  PHONE: "phone",
  IN_PERSON: "map-pin",
};

export function MentorProfilePage() {
  const { mentorId } = useParams<{ mentorId: string }>();
  const { data, isPending, isError, error, refetch } = useMentorProfile(mentorId);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);

  if (isPending) {
    return <ProfileSkeleton />;
  }

  if (isError) {
    const notFound = isApiError(error) && error.status === 404;

    if (notFound) {
      return (
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
          <EmptyState
            title="Mentor not found"
            description="This mentor doesn't exist, or the link may be out of date."
            action={
              <Link to={paths.discover} className="text-sm font-semibold text-pine underline underline-offset-2">
                Back to Discover
              </Link>
            }
          />
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
        <ErrorState
          title="Couldn't load this profile"
          description={isApiError(error) ? error.message : "Something went wrong. Please try again."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const mentor = data.mentor;
  const selectedOffering = mentor.offerings.find((offering) => offering.id === selectedOfferingId) ?? null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
      <Link to={paths.discover} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-charcoal-muted hover:text-charcoal">
        <Icon name="chevron-left" />
        Back to Discover
      </Link>

      {/* Header — identity */}
      <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="aspect-[4/5] w-full flex-none overflow-hidden rounded-lg bg-pine shadow-md sm:w-[220px]">
          {mentor.avatarUrl ? (
            <img
              src={mentor.avatarUrl}
              alt={mentor.name}
              className="h-full w-full object-cover [filter:sepia(8%)_saturate(1.08)_contrast(1.03)_brightness(1.02)]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-serif text-5xl font-semibold text-ivory">
              {mentor.name
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1">
          {mentor.primaryCategory && <p className="text-xs font-bold text-charcoal-muted">{CATEGORY_LABELS[mentor.primaryCategory]}</p>}
          <h1 className="mt-1 font-serif text-[30px] font-semibold leading-tight text-charcoal">{mentor.name}</h1>

          {mentor.country && (
            <p className="mt-2 text-[13px] text-charcoal-muted">
              {countryFlagEmoji(mentor.country)} {mentor.country}
            </p>
          )}

          {mentor.headline && <p className="mt-3 max-w-[60ch] text-sm text-charcoal-2">{mentor.headline}</p>}

          {mentor.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {mentor.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          )}

          <div className="mt-5 flex w-fit divide-x divide-line overflow-hidden rounded-md bg-ivory-raised shadow-sm">
            <div className="px-5 py-3">
              <p className="text-[21px] font-extrabold tabular-nums text-charcoal">
                {mentor.averageRating !== null ? mentor.averageRating.toFixed(1) : "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-charcoal-muted">{mentor.reviewCount === 1 ? "Review" : "Reviews"}</p>
            </div>
            <div className="px-5 py-3">
              <p className="text-[21px] font-extrabold tabular-nums text-charcoal">{mentor.completedSessionCount}</p>
              <p className="mt-0.5 text-[11px] text-charcoal-muted">Sessions completed</p>
            </div>
            {mentor.yearsExperience != null && (
              <div className="px-5 py-3">
                <p className="text-[21px] font-extrabold tabular-nums text-charcoal">{mentor.yearsExperience}</p>
                <p className="mt-0.5 text-[11px] text-charcoal-muted">Years experience</p>
              </div>
            )}
          </div>

          {mentor.connectionModes.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {mentor.connectionModes.map((mode) => (
                <span key={mode} className="inline-flex items-center gap-1.5 rounded-xs border border-line px-2.5 py-1.5 text-xs font-semibold text-charcoal-2">
                  <Icon name={CONNECTION_MODE_ICON[mode]} />
                  {CONNECTION_MODE_LABELS[mode]}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Body — main content + booking sidebar */}
      <div className="mt-10 grid grid-cols-1 gap-10 border-t border-line pt-8 tablet:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-10">
          {mentor.bio && (
            <section>
              <SectionHeading title="About" />
              <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-charcoal-2">{mentor.bio}</p>
            </section>
          )}

          {mentor.experienceEntries.length > 0 && (
            <section>
              <SectionHeading title="Experience" />
              <div className="mt-4">
                <ExperienceTimeline entries={mentor.experienceEntries} />
              </div>
            </section>
          )}

          <section>
            <SectionHeading title="Offerings" description="Select an offering to see pricing and continue toward booking." />
            <div className="mt-4">
              <OfferingList offerings={mentor.offerings} selectedOfferingId={selectedOfferingId} onSelect={setSelectedOfferingId} />
            </div>
          </section>
        </div>

        <div className="tablet:sticky tablet:top-6 tablet:self-start">
          <BookingPanel
            key={selectedOffering?.id ?? "none"}
            mentorId={mentor.id}
            mentorName={mentor.name}
            mentorConnectionModes={mentor.connectionModes}
            selectedOffering={selectedOffering}
          />
        </div>
      </div>
    </div>
  );
}
