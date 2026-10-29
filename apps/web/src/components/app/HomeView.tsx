"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { getBudget, getMe, getRecap, listTransactions } from "@/lib/client";
import { formatIdr } from "@/lib/money";
import { monthLabel } from "@/lib/months";
import { useClock } from "@/lib/useClock";
import type { Budget } from "@/lib/types";
import { TransactionRow } from "./TransactionRow";
import { Card, EmptyState, ErrorState, Skeleton } from "./ui";

const budgetTone: Record<Budget["status"], string> = {
  unset: "bg-surface-subtle text-text-secondary",
  "on-track": "bg-status-success-subtle text-text-primary",
  "near-limit": "bg-status-warning-subtle text-text-primary",
  over: "bg-status-danger-subtle text-status-danger",
};

const quickLinks = [
  { href: "/app/transactions", label: "Transactions", icon: "receipt" },
  { href: "/app/recap", label: "Recap", icon: "recap" },
  { href: "/app/chat", label: "Ask Notarik", icon: "quick-add" },
] as const;

function greeting(hour: number) {
  return hour < 11 ? "Good morning" : hour < 15 ? "Good afternoon" : hour < 19 ? "Good evening" : "Hello";
}

export function HomeView() {
  const clock = useClock();
  const month = clock?.month ?? "";
  const ready = clock !== null;
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const recap = useQuery({ queryKey: ["recap", month], queryFn: () => getRecap(month), enabled: ready });
  const budget = useQuery({ queryKey: ["budget", month], queryFn: () => getBudget(month), enabled: ready });
  const recent = useQuery({ queryKey: ["recent", month], queryFn: () => listTransactions({ month, limit: 5 }), enabled: ready });

  const firstName = me.data?.name?.trim().split(/\s+/)[0];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-headline-4 font-bold">
        {clock ? greeting(clock.hour) : "Hello"}
        {firstName ? `, ${firstName}` : ""}
      </h1>

      <section aria-label="Quick links" className="grid grid-cols-3 gap-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-col items-center gap-2 rounded-3xl bg-surface-default p-4 text-center text-caption font-medium transition-transform hover:-translate-y-0.5 md:flex-row md:gap-3 md:p-5 md:text-left md:text-body-2"
          >
            <Image src={`/icons/${link.icon}.png`} alt="" width={64} height={64} className="size-10 object-contain md:size-12" />
            {link.label}
          </Link>
        ))}
      </section>

      <section aria-label="Month summary" className="grid gap-4 md:grid-cols-2">
        <Card className="bg-linear-to-br from-brand-primary to-brand-gradient-to text-text-inverse">
          <p className="text-caption">Spent in {month ? monthLabel(month) : "this month"}</p>
          {recap.isPending ? (
            <Skeleton className="mt-2 h-10 w-48 bg-text-inverse/30" />
          ) : recap.isError ? (
            <p role="alert" className="mt-2 text-body-2">Could not load your total.</p>
          ) : (
            <>
              <p className="mt-1 font-heading text-headline-4 font-bold">{formatIdr(recap.data.total_minor)}</p>
              <p className="text-caption">
                {recap.data.count} {recap.data.count === 1 ? "expense" : "expenses"}
              </p>
            </>
          )}
        </Card>

        <Card>
          <p className="text-caption text-text-secondary">Budget</p>
          {budget.isPending ? (
            <Skeleton className="mt-2 h-10 w-40" />
          ) : budget.isError ? (
            <p role="alert" className="mt-2 text-body-2 text-status-danger">Could not load your budget.</p>
          ) : (
            <>
              <p className="mt-1 font-heading text-headline-4 font-bold">
                {budget.data.limit_minor === null ? "Not set" : formatIdr(budget.data.limit_minor)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-caption-small font-semibold ${budgetTone[budget.data.status]}`}>
                  {budget.data.label}
                </span>
                {budget.data.remaining_minor !== null && (
                  <span className="text-caption text-text-secondary">
                    {budget.data.remaining_minor >= 0
                      ? `${formatIdr(budget.data.remaining_minor)} left`
                      : `${formatIdr(-budget.data.remaining_minor)} over`}
                  </span>
                )}
              </div>
            </>
          )}
        </Card>
      </section>

      <section aria-labelledby="recent-heading">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="recent-heading" className="font-heading text-body-1 font-bold">
            Recent
          </h2>
          <Link href="/app/transactions" className="text-caption font-medium text-brand-primary-strong hover:underline">
            See all
          </Link>
        </div>
        {recent.isPending ? (
          <div aria-busy="true" aria-label="Loading recent expenses" className="flex flex-col gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : recent.isError ? (
          <ErrorState message={recent.error.message} onRetry={() => recent.refetch()} />
        ) : recent.data.items.length === 0 ? (
          <EmptyState title="No expenses yet" hint="Snap a receipt or type what you bought in the Notarik app." />
        ) : (
          <Card className="py-2 md:py-3">
            <ul className="divide-y divide-border-default">
              {recent.data.items.map((row) => (
                <TransactionRow key={row.id} row={row} />
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
