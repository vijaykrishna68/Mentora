/**
 * Shown only while the session's auth status is still unknown (before any
 * shell can decide what to render). Restrained by design — a small mark,
 * not a full-page spinner — per the "no full-page spinners for every
 * loading state" guidance; every other loading state should use Skeleton.
 */
export function RouteLoader() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-screen items-center justify-center bg-ivory">
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-pine"
      />
    </div>
  );
}
