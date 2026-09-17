import { Badge, Button, Icon, type IconName } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import { useToastStore } from "@/lib/stores/toastStore";
import { AVAILABILITY_CATEGORY_LABELS, CATEGORY_LABELS, CONNECTION_MODE_LABELS, type ConnectionMode, type Offering } from "@/types";
import { useUpdateOffering } from "../useOfferingMutations";

const CONNECTION_MODE_ICON: Record<ConnectionMode, IconName> = {
  GOOGLE_MEET: "video",
  ZOOM: "video",
  PHONE: "phone",
  IN_PERSON: "map-pin",
};

interface OfferingCardProps {
  offering: Offering;
  onEdit: () => void;
  onDelete: () => void;
}

export function OfferingCard({ offering, onEdit, onDelete }: OfferingCardProps) {
  const mutation = useUpdateOffering(offering.id);
  const pushToast = useToastStore((state) => state.push);

  function toggleActive() {
    const next = !offering.isActive;
    mutation.mutate(
      { isActive: next },
      {
        onSuccess: () => {
          pushToast({ variant: "success", title: next ? "Offering activated" : "Offering deactivated" });
        },
        onError: (error) => {
          pushToast({
            variant: "error",
            title: "Couldn't update offering",
            description: isApiError(error) ? error.message : "Something went wrong. Please try again.",
          });
        },
      },
    );
  }

  return (
    <li className="rounded-md border-[length:var(--b-hair)] border-line bg-ivory-raised p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-serif text-base font-semibold text-charcoal">{offering.name}</p>
          {offering.description && <p className="mt-1 max-w-[52ch] text-[12.5px] text-charcoal-muted">{offering.description}</p>}
        </div>
        <Badge variant={offering.isActive ? "success" : "neutral"}>{offering.isActive ? "Active" : "Inactive"}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="sage">{CATEGORY_LABELS[offering.category]}</Badge>
        {offering.connectionModes.map((mode) => (
          <Badge key={mode}>
            <Icon name={CONNECTION_MODE_ICON[mode]} />
            {CONNECTION_MODE_LABELS[mode]}
          </Badge>
        ))}
        {offering.availabilityCategories.map((availabilityCategory) => (
          <Badge key={availabilityCategory}>{AVAILABILITY_CATEGORY_LABELS[availabilityCategory]}</Badge>
        ))}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2 text-[12.5px]">
        <span className="text-charcoal-muted">{offering.durationMinutes} min</span>
        <span className="font-bold tabular-nums text-charcoal">
          {offering.currency} {offering.price}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={toggleActive} loading={mutation.isPending}>
          {offering.isActive ? "Deactivate" : "Activate"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
          Remove
        </Button>
      </div>
    </li>
  );
}
