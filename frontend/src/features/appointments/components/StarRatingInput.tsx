import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const STARS = [1, 2, 3, 4, 5];

/** 1-5 star picker, keyboard-operable radio group (mirrors StatusPill's never-color-alone rule via aria-checked + aria-label). */
export function StarRatingInput({ value, onChange, disabled }: StarRatingInputProps) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          disabled={disabled}
          onClick={() => onChange(star)}
          className="p-0.5 text-2xl disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="star" className={cn(star <= value ? "text-accent" : "text-charcoal-faint")} />
        </button>
      ))}
    </div>
  );
}
