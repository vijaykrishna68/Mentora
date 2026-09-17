import { Skeleton } from "@/components/ui";

/** Layout-preserving loading state — mirrors the loaded header + body grid shape. */
export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <Skeleton className="h-4 w-32" />
      <div className="mt-6 flex flex-col gap-6 sm:flex-row">
        <Skeleton className="aspect-[4/5] w-full flex-none rounded-lg sm:w-[220px]" />
        <div className="flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-8 w-64" />
          <Skeleton className="mt-3 h-4 w-48" />
          <Skeleton className="mt-4 h-16 w-full max-w-md" />
        </div>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-10 tablet:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="mt-6 h-5 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-48 w-full rounded-md" />
      </div>
    </div>
  );
}
