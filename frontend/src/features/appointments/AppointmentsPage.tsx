import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, EmptyState, ErrorState, Skeleton, Tabs } from "@/components/ui";
import { paths } from "@/app/router/paths";
import { isApiError } from "@/lib/api/errors";
import { AppointmentCard } from "./components/AppointmentCard";
import { useAppointments } from "./useAppointments";

type TabValue = "upcoming" | "past";

const TABS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

function AppointmentListSkeleton() {
  return (
    <ul className="flex flex-col gap-4">
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="rounded-md border-[length:var(--b-hair)] border-line bg-ivory-raised p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-1.5 h-3 w-24" />
            </div>
          </div>
          <Skeleton className="mt-4 h-24 w-full" />
        </li>
      ))}
    </ul>
  );
}

export function AppointmentsPage() {
  const [tab, setTab] = useState<TabValue>("upcoming");
  const { data, isPending, isError, error, refetch } = useAppointments();

  const appointments = tab === "upcoming" ? (data?.upcoming ?? []) : (data?.past ?? []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
      <h1 className="font-serif text-[26px] font-semibold text-charcoal">My appointments</h1>
      <p className="mt-1.5 text-sm text-charcoal-muted">Your upcoming and past mentoring sessions.</p>

      <div className="mt-6">
        <Tabs items={TABS} value={tab} onChange={(value) => setTab(value as TabValue)} label="Appointment period" />
      </div>

      <div className="mt-5">
        {isPending && <AppointmentListSkeleton />}

        {isError && (
          <ErrorState
            title="Couldn't load your appointments"
            description={isApiError(error) ? error.message : "Something went wrong. Please try again."}
            onRetry={() => refetch()}
          />
        )}

        {!isPending && !isError && appointments.length === 0 && (
          <EmptyState
            title={tab === "upcoming" ? "No upcoming appointments" : "No past appointments"}
            description={
              tab === "upcoming"
                ? "Book a session with a mentor to see it here."
                : "Completed and cancelled sessions will appear here."
            }
            action={
              tab === "upcoming" && (
                <Link to={paths.discover}>
                  <Button variant="secondary" size="sm">
                    Find a mentor
                  </Button>
                </Link>
              )
            }
          />
        )}

        {!isPending && !isError && appointments.length > 0 && (
          <ul className="flex flex-col gap-4">
            {appointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
