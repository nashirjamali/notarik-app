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

function greeting(hour: number) {
  return hour < 11 ? "Good morning" : hour < 15 ? "Good afternoon" : hour < 19 ? "Good evening" : "Hello";
}

const asset = (path: string) => `/app-assets/${path}`;

const shortcuts = [
  { label: "Quick add", icon: "quick-add", tint: "#F0E6FF", href: "/app/transactions/new" },
  { label: "Recap", icon: "recap", tint: "#CFE5FF", href: "/app/recap" },
  { label: "Budget", icon: "budget", tint: "#DAFBE6", href: "/app/recap" },
  { label: "Transactions", icon: "transactions", tint: "#F8E8C9", href: "/app/transactions" },
] as const;

const suggestions = ["Am I on track this month?", "Log nasi goreng 25k", "Show my coffee spending"];

function ActionCard({ href, title, subtitle, icon, primary }: { href: string; title: string; subtitle: string; icon: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex h-56 min-w-0 flex-1 flex-col justify-between overflow-hidden rounded-3xl px-4 pt-4 pb-[18px] transition-transform hover:-translate-y-0.5 ${
        primary ? "bg-brand-primary text-text-inverse" : "bg-surface-subtle text-text-primary"
      }`}
    >
      <span className="flex items-start justify-between">
        <span className={`flex size-12 items-center justify-center rounded-full ${primary ? "bg-surface-default/20" : "bg-surface-default"}`}>
          <Image src={asset(`svg/${icon}.svg`)} alt="" width={24} height={24} unoptimized />
        </span>
        <Image src={asset(`svg/icon-arrow-up-right${primary ? "" : "-dark"}.svg`)} alt="" width={20} height={20} unoptimized />
      </span>
      <span className="flex flex-col gap-1.5">
        <span className="text-body-1 font-semibold">{title}</span>
        <span className={`text-caption-small ${primary ? "" : "text-text-secondary"}`}>{subtitle}</span>
      </span>
    </Link>
  );
}

/** The mobile app's Home: header, hero, two action cards, four shortcuts, suggested questions. */
function MobileHome() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex h-12 items-center md:hidden">
        <Image src={asset("svg/logo-full.svg")} alt="Notarik" width={98} height={28} unoptimized priority />
      </div>
      <h1 className="font-heading text-[40px] leading-[48px] font-bold tracking-[-1.6px]">
        Snap it.
        <br />
        We&apos;ll sort it.
      </h1>

      <div className="flex gap-3">
        <ActionCard href="/app/receipts/new" title="Snap receipt" subtitle="Photo a receipt, we'll do the rest" icon="icon-camera" primary />
        <ActionCard href="/app/chat" title="Ask Notarik" subtitle="Ask anything about your spending" icon="ask-mark" />
      </div>

      <ul className="flex gap-2 py-2">
        {shortcuts.map((tile) => (
          <li key={tile.label} className="min-w-0 flex-1">
            <Link href={tile.href} className="flex flex-col items-center gap-2">
              <span className="flex size-[60px] items-center justify-center rounded-xl" style={{ backgroundColor: tile.tint }}>
                <Image src={asset(`icons/${tile.icon}.png`)} alt="" width={92} height={92} className="size-[46px] object-contain" />
              </span>
              <span className="text-center text-caption-small font-semibold whitespace-nowrap">{tile.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="try-asking" className="flex flex-col gap-3">
        <h2 id="try-asking" className="flex items-center gap-1.5 text-caption-small font-semibold text-text-secondary">
          <Image src={asset("svg/logo-mark.svg")} alt="" width={16} height={14} unoptimized />
          Try asking Notarik
        </h2>
        <ul className="-mx-6 flex gap-2 overflow-x-auto px-6 py-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          {suggestions.map((text) => (
            <li key={text} className="shrink-0">
              <Link
                href={`/app/chat?prompt=${encodeURIComponent(text)}`}
                className="flex items-center gap-1.5 rounded-full border border-border-default bg-surface-default px-3.5 py-2 text-caption whitespace-nowrap"
              >
                <Image src={asset("svg/icon-sparkle.svg")} alt="" width={16} height={16} unoptimized />
                {text}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
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
      <MobileHome />

      {/* Wide layout only: the mobile Home is just the part above; here the month sits beneath it. */}
      <div className="hidden flex-col gap-6 md:flex">
        <h2 className="font-heading text-body-1 font-bold">
          {clock ? greeting(clock.hour) : "Hello"}
          {firstName ? `, ${firstName}` : ""}
        </h2>

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
    </div>
  );
}
