import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/types";

interface DiscoverFiltersProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  category: Category | undefined;
  onCategoryChange: (category: Category | undefined) => void;
}

/** Restrained filter row: search + a single-select category chip strip. No filter drawer — the backend only supports these two dimensions plus sort (rendered separately, next to the results count). */
export function DiscoverFilters({ searchInput, onSearchInputChange, category, onCategoryChange }: DiscoverFiltersProps) {
  return (
    <div>
      <div className="relative max-w-[420px]">
        <Icon name="search" className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-charcoal-faint" />
        <input
          type="search"
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
          placeholder="Search mentors by name or headline"
          aria-label="Search mentors"
          className="w-full rounded-sm border-[length:var(--b-def)] border-line bg-ivory-raised py-[11px] pl-[38px] pr-[13px] text-sm text-charcoal placeholder:text-charcoal-faint focus:border-pine focus:shadow-[var(--focus-ring)] focus:outline-none"
        />
      </div>

      <div role="group" aria-label="Filter by category" className="mt-3.5 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => onCategoryChange(undefined)}
          aria-pressed={category === undefined}
          className={cn(
            "flex-none rounded-sm border border-line px-3.5 py-2 text-xs font-semibold text-charcoal-2 transition-colors duration-[var(--dur-fast)]",
            category === undefined ? "border-pine bg-pine text-ivory" : "bg-ivory-raised hover:border-charcoal-faint",
          )}
        >
          All
        </button>
        {CATEGORIES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onCategoryChange(value)}
            aria-pressed={category === value}
            className={cn(
              "flex-none rounded-sm border border-line px-3.5 py-2 text-xs font-semibold text-charcoal-2 transition-colors duration-[var(--dur-fast)]",
              category === value ? "border-pine bg-pine text-ivory" : "bg-ivory-raised hover:border-charcoal-faint",
            )}
          >
            {CATEGORY_LABELS[value]}
          </button>
        ))}
      </div>
    </div>
  );
}
