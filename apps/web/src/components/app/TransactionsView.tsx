"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { downloadCsv, getRecap, listTransactions } from "@/lib/client";
import { groupByDay } from "@/lib/group";
import { formatIdr } from "@/lib/money";
import { dayHeading } from "@/lib/months";
import { useClock } from "@/lib/useClock";
import { useDebounced } from "@/lib/useDebounced";
import { categoryOrder, type Category } from "@/lib/types";
import { MonthSwitcher } from "./MonthSwitcher";
import { TransactionRow } from "./TransactionRow";
import { EmptyState, ErrorState, Skeleton, categoryMeta } from "./ui";

export function TransactionsView() {
  const clock = useClock();
  const [picked, setMonth] = useState<string>();
  const [category, setCategory] = useState<Category | undefined>();
  const month = picked ?? clock?.month;
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [exportError, setExportError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const searchBox = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (searching) searchBox.current?.focus();
  }, [searching]);

  const query = useInfiniteQuery({
    queryKey: ["transactions", month, category ?? "all", q],
    queryFn: ({ pageParam }) => listTransactions({ month: month!, category, q, cursor: pageParam, limit: 30 }),
    enabled: month !== undefined,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });

  const recap = useQuery({ queryKey: ["recap", month], queryFn: () => getRecap(month!), enabled: month !== undefined });
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
  const groups = groupByDay(rows);
  const now = clock?.today ?? "";

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3 md:mb-6">
        <h1 className="font-heading text-body-1 font-semibold md:text-headline-4 md:font-bold">Transactions</h1>
        <button
          type="button"
          aria-label={searching ? "Close search" : "Search"}
          onClick={() => {
            setSearching((value) => !value);
            if (searching) setSearch("");
          }}
          className="flex size-12 items-center justify-center rounded-full bg-border-default md:hidden"
        >
          <Image src="/app-assets/svg/list-search.svg" alt="" width={24} height={24} unoptimized />
        </button>
        {/* Wide layout: the actions that the mobile app keeps in the menu and in Settings. */}
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/app/receipts/new" className="rounded-full bg-brand-accent-subtle px-5 py-2.5 text-button-2 font-bold text-brand-primary-strong transition-colors hover:bg-brand-accent">
            Scan receipt
          </Link>
          <button
            type="button"
            onClick={() => downloadCsv().then(() => setExportError(null), (e: Error) => setExportError(e.message))}
            className="rounded-full bg-surface-default px-5 py-2.5 text-button-2 font-bold hover:bg-border-default"
          >
            Export CSV
          </button>
        </div>
      </div>
      {exportError && (
        <p role="alert" className="mb-3 text-caption text-status-danger">
          {exportError}
        </p>
      )}

      <div className={`mb-3 rounded-2xl bg-surface-subtle px-4 md:mb-4 md:block md:max-w-sm md:rounded-full md:bg-surface-default md:px-5 ${searching ? "" : "hidden"}`}>
        <input
          type="search"
          aria-label="Search expenses"
          placeholder="Search merchant or note"
          maxLength={100}
          ref={searchBox}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-11 w-full bg-transparent text-caption outline-none md:text-body-2"
        />
      </div>

      <div className="mb-3 flex items-center justify-between gap-3 py-3">
        {month ? <MonthSwitcher month={month} onChange={setMonth} /> : <Skeleton className="h-8 w-48" />}
        <div className="flex flex-col items-end">
          <span className="text-caption-small text-text-secondary">Spent</span>
          <span className="text-caption font-medium">{formatIdr(recap.data?.total_minor ?? 0)}</span>
        </div>
      </div>

      <div role="radiogroup" aria-label="Filter by category" className="-mx-6 mb-3 flex gap-2 overflow-x-auto px-6 pb-3 md:mx-0 md:flex-wrap md:px-0">
        {[undefined, ...categoryOrder].map((value) => {
          const active = value === category;
          return (
            <button
              key={value ?? "all"}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setCategory(active ? undefined : value)}
              style={active && value ? { backgroundColor: `var(--color-category-${value.toLowerCase()})`, borderColor: `var(--color-category-${value.toLowerCase()})` } : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-full border py-2 text-caption ${
                value ? "pr-3.5 pl-3" : "px-4"
              } ${
                active ? (value ? "text-text-primary font-medium" : "border-text-primary bg-text-primary font-medium text-text-inverse") : "border-border-default bg-surface-default"
              }`}
            >
              {value && <span aria-hidden="true" className={`size-2 rounded-full ${active ? "bg-surface-default" : categoryMeta[value].dot}`} />}
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
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.date} className="md:rounded-3xl md:bg-surface-default md:p-6">
              <div className="flex items-baseline justify-between pb-1">
                <h2 className="text-caption-small font-semibold text-text-secondary">{dayHeading(group.date, now)}</h2>
                <span className="text-caption-small text-text-secondary">{formatIdr(group.total)}</span>
              </div>
              <ul>
                {group.items.map((row) => (
                  <TransactionRow key={row.id} row={row} />
                ))}
              </ul>
            </section>
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
