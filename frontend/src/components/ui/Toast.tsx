import { useEffect } from "react";
import { useToastStore, type Toast as ToastData } from "@/lib/stores/toastStore";
import { cn } from "@/lib/utils/cn";

const DISMISS_AFTER_MS = 5000;

const variantClass: Record<ToastData["variant"], string> = {
  success: "border-success/30 bg-success-tint text-success",
  error: "border-error/30 bg-error-tint text-error",
  info: "border-line bg-ivory-raised text-charcoal",
};

function ToastItem({ toast }: { toast: ToastData }) {
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), DISMISS_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, dismiss]);

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto w-full max-w-sm rounded-sm border-[length:var(--b-def)] px-4 py-3 shadow-md",
        variantClass[toast.variant],
      )}
    >
      <p className="text-sm font-semibold">{toast.title}</p>
      {toast.description && <p className="mt-0.5 text-xs opacity-90">{toast.description}</p>}
    </div>
  );
}

/** Restrained, non-blocking feedback — mount once near the app root. */
export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
