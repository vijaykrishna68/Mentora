import { Badge, Icon, Mark, type IconName } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_LABELS, CONNECTION_MODE_LABELS, type ConnectionMode, type PublicOffering } from "@/types";

const CONNECTION_MODE_ICON: Record<ConnectionMode, IconName> = {
  GOOGLE_MEET: "video",
  ZOOM: "video",
  PHONE: "phone",
  IN_PERSON: "map-pin",
};

const AVAILABILITY_CATEGORY_LABELS: Record<string, string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
};

interface OfferingListProps {
  offerings: PublicOffering[];
  selectedOfferingId: string | null;
  onSelect: (offeringId: string) => void;
}

/** Respects the offering exactly as modeled by the backend — duration, price, and availability categories are never recomputed or re-derived client-side. */
export function OfferingList({ offerings, selectedOfferingId, onSelect }: OfferingListProps) {
  if (offerings.length === 0) {
    return <p className="text-sm text-charcoal-muted">This mentor doesn't have any active offerings right now.</p>;
  }

  return (
    <div role="radiogroup" aria-label="Choose an offering" className="flex flex-col gap-3">
      {offerings.map((offering) => {
        const selected = offering.id === selectedOfferingId;
        return (
          <button
            key={offering.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(offering.id)}
            className={cn(
              "flex items-start gap-3.5 rounded-md border border-line bg-ivory-raised p-4 text-left transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-editorial)]",
              selected && "border-pine shadow-sm",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-[length:var(--b-def)]",
                selected ? "border-pine" : "border-charcoal-faint",
              )}
            >
              {selected && <span className="h-[9px] w-[9px] rounded-full bg-pine" />}
            </span>

            <span className="flex-1">
              <span className="block">
                <span className="text-[14.5px] font-bold text-charcoal">{offering.name}</span>
                <Mark active={selected} className="mt-1" />
              </span>
              {offering.description && <span className="mt-1 block text-[12.5px] text-charcoal-muted">{offering.description}</span>}

              <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="sage">{CATEGORY_LABELS[offering.category]}</Badge>
                {offering.connectionModes.map((mode) => (
                  <Badge key={mode}>
                    <Icon name={CONNECTION_MODE_ICON[mode]} />
                    {CONNECTION_MODE_LABELS[mode]}
                  </Badge>
                ))}
                {offering.availabilityCategories.map((availabilityCategory) => (
                  <Badge key={availabilityCategory}>{AVAILABILITY_CATEGORY_LABELS[availabilityCategory] ?? availabilityCategory}</Badge>
                ))}
              </span>
            </span>

            <span className="flex-none text-right">
              <span className="block text-sm font-bold tabular-nums text-charcoal">
                {offering.currency} {offering.price}
              </span>
              <span className="mt-0.5 block text-[11.5px] text-charcoal-faint">{offering.durationMinutes} min</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
