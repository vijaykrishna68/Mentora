import { useState } from "react";
import { Button, Card, EmptyState } from "@/components/ui";
import { formatMonthYear } from "@/lib/utils/datetime";
import type { ExperienceEntry } from "@/types";
import { DeleteExperienceDialog } from "./DeleteExperienceDialog";
import { ExperienceFormDialog } from "./ExperienceFormDialog";

/** Renders the backend's own order — never re-sorted client-side. */
export function ExperienceManager({ entries }: { entries: ExperienceEntry[] }) {
  const [formEntry, setFormEntry] = useState<ExperienceEntry | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<ExperienceEntry | null>(null);

  function openCreate() {
    setFormEntry(undefined);
    setFormOpen(true);
  }

  function openEdit(entry: ExperienceEntry) {
    setFormEntry(entry);
    setFormOpen(true);
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-serif text-base font-semibold text-charcoal">Experience</p>
        <Button type="button" variant="secondary" size="sm" onClick={openCreate}>
          Add experience
        </Button>
      </div>

      <div className="mt-4">
        {entries.length === 0 ? (
          <EmptyState title="No experience added yet" description="Add roles and organizations to build out your profile timeline." />
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 rounded-sm border border-line bg-ivory p-3">
                <div>
                  <p className="text-sm font-bold text-charcoal">{entry.role}</p>
                  <p className="text-[12.5px] text-charcoal-muted">{entry.organization}</p>
                  <p className="mt-1 text-[12px] text-charcoal-faint">
                    {formatMonthYear(entry.startDate)} — {entry.endDate ? formatMonthYear(entry.endDate) : "Present"}
                  </p>
                  {entry.description && <p className="mt-1.5 max-w-[58ch] text-[13px] text-charcoal-2">{entry.description}</p>}
                </div>
                <div className="flex flex-none gap-1.5">
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(entry)}>
                    Edit
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteEntry(entry)}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ExperienceFormDialog open={formOpen} onClose={() => setFormOpen(false)} entry={formEntry} />
      {deleteEntry && <DeleteExperienceDialog open onClose={() => setDeleteEntry(null)} entry={deleteEntry} />}
    </Card>
  );
}
