import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { paths } from "@/app/router/paths";
import { isApiError } from "@/lib/api/errors";
import { useSession } from "@/features/auth/useSession";
import { MentorAppointmentCard } from "./components/MentorAppointmentCard";
import { MentorAppointmentDetailDialog } from "./components/MentorAppointmentDetailDialog";
import { useMentorAppointments } from "./useMentorAppointments";

const UPCOMING_PREVIEW_LIMIT = 5;

function DashboardSkeleton() {
  return (
    <div>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-8 w-64" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-sm">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <Skeleton className="mt-8 h-5 w-48" />
      <ul className="mt-4 flex flex-col gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="rounded-md border-[length:var(--b-hair)] border-line bg-ivory-raised p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1.5 h-3 w-24" />
              </div>
            </div>
            <Skeleton className="mt-4 h-4 w-full" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MentorDashboardPage() {
  const session = useSession();
  const { data, isPending, isError, error, refetch } = useMentorAppointments();
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  if (isPending) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load your dashboard"
        description={isApiError(error) ? error.message : "Something went wrong. Please try again."}
        onRetry={() => refetch()}
      />
    );
  }

  const upcoming = data.upcoming;
  const completedCount = data.past.filter((appointment) => appointment.status === "COMPLETED").length;
  const visibleUpcoming = upcoming.slice(0, UPCOMING_PREVIEW_LIMIT);
  const selectedAppointment = upcoming.find((appointment) => appointment.id === selectedAppointmentId) ?? null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal-faint">Dashboard</p>
      <h1 className="mt-1.5 font-serif text-[26px] font-semibold text-charcoal">
        {session.status === "authenticated" ? `Welcome back, ${session.user.name}` : "Welcome back"}
      </h1>
      <p className="mt-1.5 text-sm text-charcoal-muted">Here's what's on your schedule.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-sm">
        <Card className="px-4 py-3">
          <p className="text-2xl font-extrabold tabular-nums text-charcoal">{upcoming.length}</p>
          <p className="mt-0.5 text-xs text-charcoal-muted">Upcoming sessions</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-2xl font-extrabold tabular-nums text-charcoal">{completedCount}</p>
          <p className="mt-0.5 text-xs text-charcoal-muted">Completed sessions</p>
        </Card>
      </div>

      <div className="mt-8 flex items-baseline justify-between gap-3">
        <h2 className="text-[19px] font-bold text-charcoal">Upcoming sessions</h2>
        {upcoming.length > 0 && (
          <Link to={paths.mentorAppointments} className="text-[12.5px] font-semibold text-pine underline underline-offset-2">
            View all appointments
          </Link>
        )}
      </div>

      <div className="mt-4">
        {upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming sessions"
            description="New bookings from customers will show up here as soon as they're scheduled."
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {visibleUpcoming.map((appointment) => (
              <MentorAppointmentCard
                key={appointment.id}
                appointment={appointment}
                onViewDetails={() => setSelectedAppointmentId(appointment.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <MentorAppointmentDetailDialog appointment={selectedAppointment} onClose={() => setSelectedAppointmentId(null)} />
    </div>
  );
}
