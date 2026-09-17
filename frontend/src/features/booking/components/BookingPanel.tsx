import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import type { AvailabilitySlot, ConnectionMode, PublicOffering } from "@/types";
import { useAvailability } from "../useAvailability";
import { AvailabilitySlots } from "./AvailabilitySlots";
import { BookingDialog } from "./BookingDialog";
import { ConnectionModeSelector } from "./ConnectionModeSelector";
import { DateSelector } from "./DateSelector";

interface BookingPanelProps {
  mentorId: string;
  mentorName: string;
  mentorConnectionModes: ConnectionMode[];
  selectedOffering: PublicOffering | null;
}

interface BookingSnapshot {
  offering: PublicOffering;
  slot: AvailabilitySlot;
  connectionMode: ConnectionMode;
  mentorTimezone: string;
}

function intersectModes(a: ConnectionMode[], b: ConnectionMode[]): ConnectionMode[] {
  return a.filter((mode) => b.includes(mode));
}

function ctaLabel(offering: PublicOffering | null, date: string | null, slot: AvailabilitySlot | null, mode: ConnectionMode | null): string {
  if (!offering) return "Select an offering";
  if (!date) return "Select a date";
  if (!slot) return "Select a time";
  if (!mode) return "Select a connection mode";
  return `Confirm booking · ${offering.currency} ${offering.price}`;
}

/**
 * The caller keys this component on `selectedOffering?.id` (see
 * MentorProfilePage) so a new offering fully remounts it — date, slot, and
 * connection-mode choices from the previous offering simply cease to exist
 * rather than needing an effect to reset them.
 */
export function BookingPanel({ mentorId, mentorName, mentorConnectionModes, selectedOffering }: BookingPanelProps) {
  const availableModes = selectedOffering ? intersectModes(selectedOffering.connectionModes, mentorConnectionModes) : [];

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [selectedConnectionMode, setSelectedConnectionMode] = useState<ConnectionMode | null>(
    availableModes.length === 1 ? (availableModes[0] ?? null) : null,
  );
  // What the currently-open (or last-opened) dialog is actually showing —
  // frozen at the moment "Confirm booking" was clicked, deliberately
  // decoupled from the live selection state above. Without this, clearing
  // `selectedSlot` on success/conflict (so it can never be re-selected
  // stale) would also unmount the dialog itself mid-flow, since its render
  // used to be gated on `selectedSlot` being non-null — the success view
  // would never get a chance to appear.
  const [bookingSnapshot, setBookingSnapshot] = useState<BookingSnapshot | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // React's recommended alternative to a reset-effect: adjust state during
  // render when the thing it depends on has visibly changed since the last
  // render, instead of scheduling a second render via useEffect.
  const [dateSlotWasClearedFor, setDateSlotWasClearedFor] = useState(selectedDate);
  if (selectedDate !== dateSlotWasClearedFor) {
    setDateSlotWasClearedFor(selectedDate);
    setSelectedSlot(null);
  }

  const availability = useAvailability(mentorId, selectedOffering?.id, selectedDate ?? undefined);

  const canOpenDialog = Boolean(selectedOffering && selectedDate && selectedSlot && selectedConnectionMode && availability.data?.timezone);

  function handleConfirmClick() {
    if (!selectedOffering || !selectedSlot || !selectedConnectionMode || !availability.data?.timezone) return;
    setBookingSnapshot({
      offering: selectedOffering,
      slot: selectedSlot,
      connectionMode: selectedConnectionMode,
      mentorTimezone: availability.data.timezone,
    });
    setDialogOpen(true);
  }

  return (
    <Card className="p-5">
      <p className="font-serif text-lg font-semibold text-charcoal">Book a session</p>

      {selectedOffering ? (
        <div className="mt-3 rounded-sm border border-line bg-ivory p-3">
          <p className="text-sm font-bold text-charcoal">{selectedOffering.name}</p>
          <p className="mt-1 flex items-baseline justify-between text-[12.5px] text-charcoal-muted">
            <span>{selectedOffering.durationMinutes} min</span>
            <span className="font-semibold text-charcoal">
              {selectedOffering.currency} {selectedOffering.price}
            </span>
          </p>
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-charcoal-muted">Choose an offering to continue.</p>
      )}

      {selectedOffering && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-charcoal-2">Date</p>
          <div className="mt-2">
            <DateSelector selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          </div>
        </div>
      )}

      {selectedOffering && selectedDate && (
        <AvailabilitySlots
          slots={availability.data?.slots ?? []}
          isPending={availability.isPending}
          isError={availability.isError}
          errorMessage={isApiError(availability.error) ? availability.error.message : null}
          durationMinutes={selectedOffering.durationMinutes}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          onTryAnotherDate={() => setSelectedDate(null)}
          onRetry={() => availability.refetch()}
        />
      )}

      {selectedSlot && availableModes.length > 1 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-charcoal-2">Connection mode</p>
          <div className="mt-2">
            <ConnectionModeSelector modes={availableModes} selected={selectedConnectionMode} onSelect={setSelectedConnectionMode} />
          </div>
        </div>
      )}

      <Button onClick={handleConfirmClick} disabled={!canOpenDialog} className="mt-4 w-full">
        {ctaLabel(selectedOffering, selectedDate, selectedSlot, selectedConnectionMode)}
      </Button>

      {bookingSnapshot && (
        <BookingDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          mentorId={mentorId}
          mentorName={mentorName}
          offering={bookingSnapshot.offering}
          slot={bookingSnapshot.slot}
          connectionMode={bookingSnapshot.connectionMode}
          mentorTimezone={bookingSnapshot.mentorTimezone}
          onConflict={() => setSelectedSlot(null)}
          onBookingSuccess={() => setSelectedSlot(null)}
        />
      )}
    </Card>
  );
}
