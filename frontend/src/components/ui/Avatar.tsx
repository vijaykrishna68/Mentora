import { useState } from "react";
import { cn } from "@/lib/utils/cn";

type AvatarSize = "sm" | "md" | "lg" | "portrait";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  className?: string;
}

const sizes: Record<AvatarSize, string> = {
  sm: "h-8 w-8 rounded-full text-xs",
  md: "h-11 w-11 rounded-full text-sm",
  lg: "h-16 w-16 rounded-full text-lg",
  // The mockup occasionally lets a mentor portrait be a tall rectangular
  // card (prof-header .portrait, 4:5) rather than a tiny circle — reserved
  // for identity moments like a full mentor profile header.
  portrait: "aspect-[4/5] w-full rounded-lg text-3xl",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Reusable portrait/avatar. Falls back to initials-on-pine when no image is set or the image fails to load. */
export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const showImage = Boolean(src) && !errored;

  return (
    <span
      className={cn(
        "flex flex-none items-center justify-center overflow-hidden bg-pine font-serif font-semibold text-ivory",
        sizes[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span aria-hidden="true">{initials(name) || "?"}</span>
      )}
    </span>
  );
}
