import { useState } from "react";
import { Button, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import { useMyMentorProfile } from "@/features/mentor-profile-management/useMyMentorProfile";
import type { Offering } from "@/types";
import { DeleteOfferingDialog } from "./components/DeleteOfferingDialog";
import { OfferingCard } from "./components/OfferingCard";
import { OfferingFormDialog } from "./components/OfferingFormDialog";
import { useOfferings } from "./useOfferings";

function OfferingListSkeleton() {
  return (
    <ul className="flex flex-col gap-4">
      {Array.from({ length: 2 }, (_, i) => (
        <li key={i} className="rounded-md border-[length:var(--b-hair)] border-line bg-ivory-raised p-4 shadow-sm sm:p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3 w-64" />
          <Skeleton className="mt-4 h-16 w-full" />
        </li>
      ))}
    </ul>
  );
}

export function MentorOfferingsPage() {
  const { data, isPending, isError, error, refetch } = useOfferings();
  const profileQuery = useMyMentorProfile();
  const [formOffering, setFormOffering] = useState<Offering | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOffering, setDeleteOfferingState] = useState<Offering | null>(null);

  const availableConnectionModes = profileQuery.data?.profile.connectionModes ?? [];

  function openCreate() {
    setFormOffering(undefined);
    setFormOpen(true);
  }

  function openEdit(offering: Offering) {
    setFormOffering(offering);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal-faint">Manage</p>
          <h1 className="mt-1.5 font-serif text-[26px] font-semibold text-charcoal">Offerings</h1>
          <p className="mt-1.5 max-w-lg text-sm text-charcoal-muted">The sessions customers can book with you.</p>
        </div>
        <Button type="button" onClick={openCreate}>
          New offering
        </Button>
      </div>

      <div className="mt-6">
        {isPending && <OfferingListSkeleton />}

        {isError && (
          <ErrorState
            title="Couldn't load your offerings"
            description={isApiError(error) ? error.message : "Something went wrong. Please try again."}
            onRetry={() => refetch()}
          />
        )}

        {!isPending && !isError && data.offerings.length === 0 && (
          <EmptyState
            title="No offerings yet"
            description="Create your first offering so customers have something to book."
            action={
              <Button variant="secondary" size="sm" onClick={openCreate}>
                New offering
              </Button>
            }
          />
        )}

        {!isPending && !isError && data.offerings.length > 0 && (
          <ul className="flex flex-col gap-4">
            {data.offerings.map((offering) => (
              <OfferingCard key={offering.id} offering={offering} onEdit={() => openEdit(offering)} onDelete={() => setDeleteOfferingState(offering)} />
            ))}
          </ul>
        )}
      </div>

      <OfferingFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        offering={formOffering}
        availableConnectionModes={availableConnectionModes}
      />
      {deleteOffering && (
        <DeleteOfferingDialog open onClose={() => setDeleteOfferingState(null)} offering={deleteOffering} />
      )}
    </div>
  );
}
