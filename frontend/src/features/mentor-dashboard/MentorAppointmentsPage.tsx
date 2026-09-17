import { useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, Icon, Skeleton, Tabs } from "@/components/ui";
import { paths } from "@/app/router/paths";
import { isApiError } from "@/lib/api/errors";
import { MentorAppointmentCard } from "./components/MentorAppointmentCard";
import { MentorAppointmentDetailDialog } from "./components/MentorAppointmentDetailDialog";
import { useMentorAppointments } from "./useMentorAppointments";

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
          <Skeleton className="mt-4 h-4 w-full" />
        </li>
      ))}
    </ul>
  );
}

export function MentorAppointmentsPage() {
  const [tab, setTab] = useState<TabValue>("upcoming");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const { data, isPending, isError, error, refetch } = useMentorAppointments();

  const appointments = tab === "upcoming" ? (data?.upcoming ?? []) : (data?.past ?? []);
  const selectedAppointment = appointments.find((appointment) => appointment.id === selectedAppointmentId) ?? null;

  return (
    <div>
      <Link
        to={paths.mentorDashboard}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-charcoal-muted hover:text-charcoal"
      >
        <Icon name="chevron-left" />
        Back to dashboard
      </Link>

      <h1 className="mt-4 font-serif text-[26px] font-semibold text-charcoal">Appointments</h1>
      <p className="mt-1.5 text-sm text-charcoal-muted">Sessions booked with you, upcoming and past.</p>

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
            title={tab === "upcoming" ? "No upcoming sessions" : "No past sessions"}
            description={
              tab === "upcoming"
                ? "New bookings from customers will show up here as soon as they're scheduled."
                : "Completed and cancelled sessions will appear here."
            }
          />
        )}

        {!isPending && !isError && appointments.length > 0 && (
          <ul className="flex flex-col gap-4">
            {appointments.map((appointment) => (
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
