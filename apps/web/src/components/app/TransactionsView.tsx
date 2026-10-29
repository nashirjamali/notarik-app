"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { downloadCsv, listTransactions } from "@/lib/client";
import { groupByDay } from "@/lib/group";
import { formatIdr } from "@/lib/money";
import { dayHeading } from "@/lib/months";
import { useClock } from "@/lib/useClock";
import { useDebounced } from "@/lib/useDebounced";
import { categories, type Category } from "@/lib/types";
import { MonthSwitcher } from "./MonthSwitcher";
import { TransactionRow } from "./TransactionRow";
import { Card, EmptyState, ErrorState, PageTitle, Skeleton, categoryMeta } from "./ui";

export function TransactionsView() {
  const clock = useClock();
  const [picked, setMonth] = useState<string>();
  const [category, setCategory] = useState<Category | undefined>();
  const month = picked ?? clock?.month;
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [exportError, setExportError] = useState<string | null>(null);

  const query = useInfiniteQuery({
    queryKey: ["transactions", month, category ?? "all", q],
    queryFn: ({ pageParam }) => listTransactions({ month: month!, category, q, cursor: pageParam, limit: 30 }),
    enabled: month !== undefined,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });

  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
  const groups = groupByDay(rows);
  const now = clock?.today ?? "";

  return (
    <>
      <PageTitle
        aside={
          <div className="flex flex-wrap items-center gap-3">
            {month ? <MonthSwitcher month={month} onChange={setMonth} /> : <Skeleton className="h-10 w-56" />}
            <Link href="/app/transactions/new" className="rounded-full bg-brand-primary px-5 py-2.5 text-button-2 font-bold text-text-inverse transition-colors hover:bg-brand-primary-strong">
              Add expense
            </Link>
          </div>
        }
      >
        Transactions
      </PageTitle>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label="Search expenses"
          placeholder="Search merchant or note"
          maxLength={100}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-w-0 flex-1 rounded-full border border-border-default bg-surface-default px-5 py-2.5 text-body-2 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-accent md:max-w-sm"
        />
        <button
          type="button"
          onClick={() => downloadCsv().then(() => setExportError(null), (e: Error) => setExportError(e.message))}
          className="rounded-full bg-surface-default px-5 py-2.5 text-button-2 font-bold hover:bg-border-default"
        >
          Export CSV
        </button>
        {exportError && (
          <p role="alert" className="w-full text-caption text-status-danger">
            {exportError}
          </p>
        )}
      </div>

      <div role="group" aria-label="Filter by category" className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {[undefined, ...categories].map((value) => {
          const active = value === category;
          return (
            <button
              key={value ?? "all"}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(value)}
              className={`shrink-0 rounded-full px-4 py-2 text-button-2 font-bold transition-colors ${
                active ? "bg-brand-primary text-text-inverse" : "bg-surface-default text-text-secondary hover:bg-border-default"
              }`}
            >
              {value ? categoryMeta[value].label : "All"}
            </button>
          );
        })}
      </div>

      {query.isPending || !month ? (
        <div aria-busy="true" aria-label="Loading transactions" className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-16" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : groups.length === 0 ? (
        <EmptyState
          title="No expenses this month"
          hint={category || q ? "Try another search, category or month." : "Add an expense and it shows up here."}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <Card key={group.date}>
              <div className="flex items-baseline justify-between">
                <h2 className="font-heading text-body-2 font-bold">{dayHeading(group.date, now)}</h2>
                <span className="text-caption text-text-secondary">{formatIdr(group.total)}</span>
              </div>
              <ul className="divide-y divide-border-default">
                {group.items.map((row) => (
                  <TransactionRow key={row.id} row={row} />
                ))}
              </ul>
            </Card>
          ))}
          {query.hasNextPage && (
            <button
              type="button"
              disabled={query.isFetchingNextPage}
              onClick={() => query.fetchNextPage()}
              className="self-center rounded-full bg-surface-default px-6 py-3 text-button-2 font-bold hover:bg-border-default disabled:opacity-60"
            >
              {query.isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </>
  );
}
