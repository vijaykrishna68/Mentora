import { Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { CONNECTION_MODE_LABELS, type ConnectionMode } from "@/types";

const CONNECTION_MODE_ICON: Record<ConnectionMode, IconName> = {
  GOOGLE_MEET: "video",
  ZOOM: "video",
  PHONE: "phone",
  IN_PERSON: "map-pin",
};

interface ConnectionModeSelectorProps {
  modes: ConnectionMode[];
  selected: ConnectionMode | null;
  onSelect: (mode: ConnectionMode) => void;
}

/** Only ever offers modes the offering AND the mentor both support (computed by the caller) — never a mode the backend would reject. */
export function ConnectionModeSelector({ modes, selected, onSelect }: ConnectionModeSelectorProps) {
  if (modes.length === 0) {
    return <p className="text-[12.5px] text-charcoal-muted">This offering has no connection mode configured yet.</p>;
  }

  return (
    <div role="radiogroup" aria-label="Connection mode" className="flex flex-wrap gap-2">
      {modes.map((mode) => {
        const isSelected = mode === selected;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(mode)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xs border border-line px-2.5 py-1.5 text-xs font-semibold text-charcoal-2 transition-colors duration-[var(--dur-fast)]",
              isSelected && "border-pine bg-ivory-raised text-pine",
            )}
          >
            <Icon name={CONNECTION_MODE_ICON[mode]} />
            {CONNECTION_MODE_LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}
