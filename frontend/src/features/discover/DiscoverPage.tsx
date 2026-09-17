import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, EmptyState, ErrorState, Pagination } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import { useDebouncedValue } from "@/lib/utils/useDebouncedValue";
import {
  DISCOVER_SORT_LABELS,
  DISCOVER_SORT_VALUES,
  type Category,
  type DiscoverQueryParams,
  type DiscoverSort,
} from "@/types";
import { DiscoverFilters } from "./components/DiscoverFilters";
import { MentorCard } from "./components/MentorCard";
import { MentorCardSkeleton } from "./components/MentorCardSkeleton";
import { useMentors } from "./useMentors";

const PAGE_SIZE = 12;

function isDiscoverSort(value: string | null): value is DiscoverSort {
  return DISCOVER_SORT_VALUES.includes(value as DiscoverSort);
}

export function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = (searchParams.get("category") as Category | null) ?? undefined;
  const q = searchParams.get("q") ?? "";
  const sort: DiscoverSort = isDiscoverSort(searchParams.get("sort")) ? (searchParams.get("sort") as DiscoverSort) : "newest";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  // Raw input updates immediately (so the URL stays shareable as you type);
  // the query itself is built from the debounced value further down, so the
  // network request only fires once typing pauses.
  const [searchInput, setSearchInput] = useState(q);
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  function updateParams(patch: Record<string, string | undefined>) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
  }

  function handleSearchInputChange(value: string) {
    setSearchInput(value);
    updateParams({ q: value || undefined, page: undefined });
  }

  function handleCategoryChange(next: Category | undefined) {
    updateParams({ category: next, page: undefined });
  }

  function handleSortChange(next: string) {
    updateParams({ sort: next, page: undefined });
  }

  const params: DiscoverQueryParams = useMemo(
    () => ({ category, q: debouncedSearch || undefined, sort, page, limit: PAGE_SIZE }),
    [category, debouncedSearch, sort, page],
  );

  const { data, isPending, isError, error, isFetching, refetch } = useMentors(params);

  const hasActiveFilters = Boolean(category || q);

  function resetFilters() {
    setSearchInput("");
    updateParams({ q: undefined, category: undefined, page: undefined });
  }

  return (
    <div>
      <div className="bg-ivory-sunken px-4 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-serif text-3xl font-semibold text-charcoal sm:text-[38px]">Find your mentor</h1>
          <p className="mt-3 max-w-[52ch] text-sm text-charcoal-muted">
            Browse mentors by category, or search by name to find the right person for your next session.
          </p>
          <div className="mt-6">
            <DiscoverFilters
              searchInput={searchInput}
              onSearchInputChange={handleSearchInputChange}
              category={category}
              onCategoryChange={handleCategoryChange}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-charcoal-faint">
            {isPending ? "Loading mentors…" : `${data?.pagination.total ?? 0} mentor${data?.pagination.total === 1 ? "" : "s"}`}
          </p>
          <label className="flex items-center gap-2 text-xs font-semibold text-charcoal-2">
            Sort
            <select
              value={sort}
              onChange={(event) => handleSortChange(event.target.value)}
              className="rounded-xs border border-line bg-ivory-raised px-2.5 py-1.5 text-xs font-semibold text-charcoal"
            >
              {DISCOVER_SORT_VALUES.map((value) => (
                <option key={value} value={value}>
                  {DISCOVER_SORT_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5">
          {isPending && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 tablet:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <MentorCardSkeleton key={i} />
              ))}
            </div>
          )}

          {isError && (
            <ErrorState
              title="Couldn't load mentors"
              description={isApiError(error) ? error.message : "Something went wrong. Please try again."}
              onRetry={() => refetch()}
            />
          )}

          {!isPending && !isError && data && data.mentors.length === 0 && (
            <EmptyState
              title="No mentors found"
              description={
                hasActiveFilters ? "Try a different search term or category." : "Check back soon — new mentors are joining regularly."
              }
              action={
                hasActiveFilters && (
                  <Button variant="secondary" size="sm" onClick={resetFilters}>
                    Reset filters
                  </Button>
                )
              }
            />
          )}

          {!isPending && !isError && data && data.mentors.length > 0 && (
            <div aria-busy={isFetching || undefined} className="grid grid-cols-1 gap-5 sm:grid-cols-2 tablet:grid-cols-3">
              {data.mentors.map((mentor) => (
                <MentorCard key={mentor.id} mentor={mentor} />
              ))}
            </div>
          )}
        </div>

        {data && data.pagination.totalPages > 1 && (
          <div className="mt-8">
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onPageChange={(next) => updateParams({ page: String(next) })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
