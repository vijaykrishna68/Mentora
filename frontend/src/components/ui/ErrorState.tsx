import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Something went wrong", description, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-md border-[length:var(--b-def)] border-error/30 bg-error-tint px-6 py-10 text-center"
    >
      <p className="font-serif text-lg font-semibold text-error">{title}</p>
      <p className="max-w-sm text-sm text-error/90">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      )}
    </div>
  );
}
