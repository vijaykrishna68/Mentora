import { Link } from "react-router-dom";
import { Avatar, Icon, buttonClass } from "@/components/ui";
import { paths } from "@/app/router/paths";
import { CATEGORY_LABELS } from "@/types";
import type { PublicMentorSummary } from "@/types";

function cheapestOffering(offerings: PublicMentorSummary["offerings"]) {
  if (offerings.length === 0) return null;
  return offerings.reduce((min, offering) => (offering.price < min.price ? offering : min));
}

/**
 * "Hybrid" mentor card (design/mentora-editorial-direction.html, Direction C —
 * portrait leading, serif name, aligned sans metadata rows, outlined CTA).
 * Deliberately omits a "next available slot" row: the Discover API doesn't
 * return earliest availability, and computing it here would mean an N+1
 * availability request per card.
 */
export function MentorCard({ mentor }: { mentor: PublicMentorSummary }) {
  const offering = cheapestOffering(mentor.offerings);
  const subtitle = [mentor.headline, mentor.yearsExperience ? `${mentor.yearsExperience} yrs` : null]
    .filter(Boolean)
    .join(" · ");
  const profileHref = paths.mentorProfile(mentor.id);

  return (
    <article className="flex flex-col overflow-hidden rounded-lg bg-ivory-raised shadow-sm transition-[transform,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-editorial)] hover:-translate-y-[3px] hover:shadow-md">
      <Link to={profileHref} className="block aspect-square overflow-hidden bg-ivory-sunken" aria-hidden="true" tabIndex={-1}>
        {mentor.avatarUrl ? (
          <img
            src={mentor.avatarUrl}
            alt=""
            className="h-full w-full object-cover [filter:sepia(6%)_saturate(1.06)_contrast(1.02)_brightness(1.01)]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Avatar name={mentor.name} size="lg" />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {mentor.primaryCategory && (
          <p className="text-xs font-bold text-charcoal-muted">{CATEGORY_LABELS[mentor.primaryCategory]}</p>
        )}
        <Link to={profileHref} className="mt-1 font-serif text-lg font-semibold leading-tight text-charcoal hover:underline">
          {mentor.name}
        </Link>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-charcoal-muted">{subtitle}</p>}

        <div className="my-2.5 border-t border-line" />

        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="flex items-center gap-1.5">
            {mentor.averageRating !== null ? (
              <>
                <Icon name="star" className="text-accent" />
                <span className="font-semibold tabular-nums">{mentor.averageRating.toFixed(1)}</span>
                <span className="text-charcoal-faint">·</span>
                <span className="text-[12.5px] text-charcoal-muted">
                  {mentor.completedSessionCount} session{mentor.completedSessionCount === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              <span className="text-[12.5px] font-semibold text-charcoal-muted">New mentor</span>
            )}
          </span>
          {offering && (
            <span className="whitespace-nowrap font-semibold tabular-nums">
              {offering.currency} {offering.price} · {offering.durationMinutes}min
            </span>
          )}
        </div>

        <Link to={profileHref} className={buttonClass("secondary", "sm", "mt-3 w-full justify-center")}>
          View profile
        </Link>
      </div>
    </article>
  );
}
