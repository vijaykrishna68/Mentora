import { type ReactNode, useId } from "react";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (fieldProps: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
}

/**
 * Shared label/hint/error wrapper for form controls. Handles the
 * id/aria-describedby/aria-invalid wiring once instead of repeating it
 * per input — the control itself (Input/Textarea/Select) is rendered via
 * the render-prop `children` so this stays control-agnostic.
 */
export function Field({ label, error, hint, required, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-charcoal-2">
        {label}
        {required && (
          <span aria-hidden="true" className="text-error">
            {" "}
            *
          </span>
        )}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="text-[11.5px] text-charcoal-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[11.5px] font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  );
}
