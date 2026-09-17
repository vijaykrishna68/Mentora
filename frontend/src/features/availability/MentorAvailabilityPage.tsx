import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, ErrorState, Skeleton } from "@/components/ui";
import { paths } from "@/app/router/paths";
import { isApiError } from "@/lib/api/errors";
import { useMyMentorProfile } from "@/features/mentor-profile-management/useMyMentorProfile";
import type { AvailabilityRule, DayOfWeek } from "@/types";
import { AvailabilityRuleFormDialog } from "./components/AvailabilityRuleFormDialog";
import { DeleteAvailabilityRuleDialog } from "./components/DeleteAvailabilityRuleDialog";
import { WeeklyScheduleView } from "./components/WeeklyScheduleView";
import { useAvailabilityRules } from "./useAvailabilityRules";

function AvailabilitySkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function MentorAvailabilityPage() {
  const { data, isPending, isError, error, refetch } = useAvailabilityRules();
  const profileQuery = useMyMentorProfile();
  const [formOpen, setFormOpen] = useState(false);
  const [formRule, setFormRule] = useState<AvailabilityRule | undefined>(undefined);
  const [formDefaultDay, setFormDefaultDay] = useState<DayOfWeek | undefined>(undefined);
  const [deleteRule, setDeleteRule] = useState<AvailabilityRule | null>(null);

  const timezone = profileQuery.data?.profile.timezone ?? null;

  function openAddForDay(day: DayOfWeek) {
    setFormRule(undefined);
    setFormDefaultDay(day);
    setFormOpen(true);
  }

  function openEdit(rule: AvailabilityRule) {
    setFormRule(rule);
    setFormDefaultDay(undefined);
    setFormOpen(true);
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal-faint">Manage</p>
      <h1 className="mt-1.5 font-serif text-[26px] font-semibold text-charcoal">Availability</h1>
      <p className="mt-1.5 max-w-lg text-sm text-charcoal-muted">Your recurring weekly hours, interpreted in your scheduling timezone.</p>

      <Card className="mt-5 flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-semibold text-charcoal-2">Availability timezone</p>
          <p className="mt-0.5 text-sm font-bold text-charcoal">{timezone ?? "Not set"}</p>
        </div>
        {!timezone && !profileQuery.isPending && (
          <Link to={paths.mentorProfileSettings} className="text-[12.5px] font-semibold text-pine underline underline-offset-2">
            Set your timezone in Profile
          </Link>
        )}
      </Card>

      <div className="mt-5">
        {isPending && <AvailabilitySkeleton />}

        {isError && (
          <ErrorState
            title="Couldn't load your availability"
            description={isApiError(error) ? error.message : "Something went wrong. Please try again."}
            onRetry={() => refetch()}
          />
        )}

        {!isPending && !isError && (
          <WeeklyScheduleView rules={data.rules} onAddForDay={openAddForDay} onEdit={openEdit} onDelete={setDeleteRule} />
        )}
      </div>

      <AvailabilityRuleFormDialog open={formOpen} onClose={() => setFormOpen(false)} rule={formRule} defaultDayOfWeek={formDefaultDay} />
      {deleteRule && <DeleteAvailabilityRuleDialog open onClose={() => setDeleteRule(null)} rule={deleteRule} />}
    </div>
  );
}
