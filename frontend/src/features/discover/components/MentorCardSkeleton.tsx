import { Skeleton } from "@/components/ui";

export function MentorCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg bg-ivory-raised shadow-sm">
      <Skeleton className="aspect-square rounded-none" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-8 w-full" />
      </div>
    </div>
  );
}
