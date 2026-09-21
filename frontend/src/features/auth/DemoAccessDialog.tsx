import { useCallback, useId } from "react";
import { Button, Dialog } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { Role } from "@/types";

const OPTIONS: { role: Role; title: string; description: string }[] = [
  {
    role: "CUSTOMER",
    title: "Explore as a Customer",
    description: "Book mentoring sessions and manage your appointments.",
  },
  {
    role: "MENTOR",
    title: "Explore as a Mentor",
    description: "Manage your profile, offerings, availability and appointments.",
  },
];

interface DemoAccessDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (role: Role) => void;
  /** The role whose demo login is in flight, or null when idle. */
  pendingRole: Role | null;
  error: string | null;
}

interface RoleOptionProps {
  title: string;
  description: string;
  onSelect: () => void;
  selected: boolean;
  disabled: boolean;
}

function RoleOption({ title, description, onSelect, selected, disabled }: RoleOptionProps) {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={selected || undefined}
      className={cn(
        "flex flex-col gap-1 rounded-md border-[length:var(--b-def)] p-4 text-left transition-[border-color,background,transform] duration-[var(--dur-fast)] ease-[var(--ease-editorial)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine active:scale-[0.99] disabled:cursor-not-allowed",
        selected
          ? "border-pine bg-ivory-raised"
          : "border-line bg-ivory hover:border-pine hover:bg-ivory-raised disabled:opacity-40 disabled:hover:border-line",
      )}
    >
      <span id={titleId} className="flex items-center gap-2 font-serif text-h3 font-semibold text-charcoal">
        {selected && (
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent text-pine"
          />
        )}
        {selected ? "Entering demo…" : title}
      </span>
      <span id={descriptionId} className="text-[13px] leading-snug text-charcoal-muted">
        {description}
      </span>
    </button>
  );
}

/** Role picker for the login page's "Try the demo" entry point. Purely presentational — LoginPage owns the login mutation. */
export function DemoAccessDialog({ open, onClose, onSelect, pendingRole, error }: DemoAccessDialogProps) {
  const isPending = pendingRole !== null;

  // Escape / backdrop-click must not dismiss the dialog mid-login.
  const handleClose = useCallback(() => {
    if (!isPending) onClose();
  }, [isPending, onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Explore Mentora"
      description="Choose how you'd like to explore the platform."
      className="max-w-lg"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => (
          <RoleOption
            key={option.role}
            title={option.title}
            description={option.description}
            onSelect={() => onSelect(option.role)}
            selected={pendingRole === option.role}
            disabled={isPending}
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[12.5px] font-semibold text-error">
          {error}
        </p>
      )}

      <p className="mt-4 text-[12px] text-charcoal-muted">
        Demo accounts are pre-populated so you can explore the full experience.
      </p>

      <div className="mt-3 flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}
