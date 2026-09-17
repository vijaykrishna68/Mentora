import { cn } from "@/lib/utils/cn";

/** Path data ported from design/mentora-editorial-direction.html's <symbol> defs. */
const ICONS = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  star: (
    <path
      d="M12 2.5l2.9 6.3 6.8.7-5.1 4.6 1.5 6.7-6.1-3.6-6.1 3.6 1.5-6.7-5.1-4.6 6.8-.7z"
      fill="currentColor"
      stroke="none"
    />
  ),
  video: (
    <>
      <rect x="2.5" y="6.5" width="13" height="11" rx="2" />
      <path d="M15.5 10l6-3.5v11l-6-3.5z" />
    </>
  ),
  phone: <path d="M5 4h3l1.5 5-2 1.5a12 12 0 006 6l1.5-2 5 1.5v3a2 2 0 01-2.2 2A17 17 0 013 6.2 2 2 0 015 4z" />,
  "map-pin": (
    <>
      <path d="M12 21s7-6.5 7-11.5A7 7 0 105 9.5C5 14.5 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </>
  ),
  "chevron-left": <path d="M15 6l-6 6 6 6" />,
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  className?: string;
}

export function Icon({ name, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn("inline-block h-[1em] w-[1em] stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]", className)}
      fill="none"
    >
      {ICONS[name]}
    </svg>
  );
}
