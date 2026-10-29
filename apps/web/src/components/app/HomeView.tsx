"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { getBudget, getMe, listTransactions } from "@/lib/client";
import { formatIdr } from "@/lib/money";
import { monthLabel, timeOf } from "@/lib/months";
import { useClock } from "@/lib/useClock";
import type { Category, Transaction } from "@/lib/types";
import { categoryMeta, EmptyState, ErrorState, Skeleton } from "./ui";

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
    <div className="flex flex-col gap-5 md:hidden">
      <div className="flex h-12 items-center md:hidden">
        <Image src={asset("svg/logo-full.svg")} alt="Notarik" width={98} height={28} unoptimized priority />
      </div>
      <h1 className="font-heading text-[40px] leading-[48px] font-bold tracking-[-2px]">
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
        <ul className="flex flex-col items-start gap-2">
          {suggestions.map((text) => (
            <li key={text} className="max-w-full">
              <Link
                href={`/app/chat?prompt=${encodeURIComponent(text)}`}
                className="flex items-center gap-1.5 rounded-full border border-border-default bg-surface-default px-3.5 py-2 text-caption"
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

const design = (name: string) => `/design/${name}`;

const desktopShortcuts = [
  { label: "Quick add", art: "3d-quick", tint: "#ede3fc", href: "/app/transactions/new" },
  { label: "Recap", art: "3d-recap", tint: "#dbebff", href: "/app/recap" },
  { label: "Budget", art: "3d-budget", tint: "#e3f7eb", href: "/app/recap" },
  { label: "Transactions", art: "3d-receipt", tint: "#fff5d6", href: "/app/transactions" },
] as const;

const desktopPrompts = ["Am I on track this month?", "Log nasi goreng 25 ribu", "Where did most of my money go?"];

const recentArt: Partial<Record<Category, string>> = { Dining: "3d-coffee", Groceries: "3d-groceries", Transport: "3d-transport", Bills: "3d-bills" };

function DesktopAction({ href, title, subtitle, art, primary }: { href: string; title: string; subtitle: string; art: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex min-w-0 flex-1 flex-col items-start gap-3 rounded-[32px] p-8 transition-transform hover:-translate-y-0.5 ${primary ? "bg-brand-primary text-text-inverse" : "bg-surface-subtle text-text-primary"}`}
    >
      <span className="flex size-[60px] items-center justify-center rounded-[20px] bg-surface-default">
        <Image src={design(`${art}.png`)} alt="" width={46} height={46} className="size-[46px] object-contain" />
      </span>
      <span className="text-body-1 font-semibold">{title}</span>
      <span className={`text-caption ${primary ? "" : "text-text-secondary"}`}>{subtitle}</span>
    </Link>
  );
}

function Stat({ label, value, note, art, wide }: { label: string; value: string; note: string; art: string; wide?: boolean }) {
  return (
    <div className={`relative flex min-w-0 flex-col gap-1.5 overflow-hidden rounded-3xl bg-surface-subtle p-6 ${wide ? "flex-[1.86]" : "flex-1"}`}>
      <p className="text-caption text-text-secondary">{label}</p>
      <p className="text-body-1 font-semibold">{value}</p>
      <p className="text-caption-small text-text-secondary">{note}</p>
      <span aria-hidden="true" className="absolute right-[7px] bottom-2.5 flex size-[43px] items-center justify-center">
        <Image src={design(`${art}.png`)} alt="" width={38} height={38} className="size-[38px] -rotate-8 object-contain" />
      </span>
    </div>
  );
}

function RecentRow({ row }: { row: Transaction }) {
  const fromReceipt = row.source === "photo" || row.source === "pdf";
  const time = timeOf(row.created_at);
  const art = recentArt[row.category];
  return (
    <li>
      <Link href={`/app/transactions/${row.id}`} className="flex items-center gap-4 rounded-2xl py-3 transition-colors hover:bg-border-default/50">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-surface-default">
          {art ? <Image src={design(`${art}.png`)} alt="" width={36} height={36} className="size-9 object-contain" /> : <span className={`size-4.5 rounded-full ${categoryMeta[row.category].dot}`} />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2.5">
            <span className="truncate text-body-2 font-medium">{row.merchant}</span>
            {fromReceipt && <span className="shrink-0 rounded-full bg-brand-accent-subtle px-2.5 py-0.5 text-caption-small font-semibold text-brand-primary-strong">From receipt</span>}
          </span>
          <span className="truncate text-caption-small text-text-secondary">
            {categoryMeta[row.category].label}
            {time ? ` · ${time}` : ""}
          </span>
        </span>
        <span className="shrink-0 text-body-2 font-medium">{formatIdr(row.total_minor)}</span>
      </Link>
    </li>
  );
}

/** Wide layout, from the Figma frame "Web app / Home / Desktop 1440": greeting and month, then actions, shortcuts, stats and prompts beside the recent list. */
function DesktopHome() {
  const clock = useClock();
  const month = clock?.month ?? "";
  const ready = clock !== null;
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const budget = useQuery({ queryKey: ["budget", month], queryFn: () => getBudget(month), enabled: ready });
  const recent = useQuery({ queryKey: ["recent", month], queryFn: () => listTransactions({ month, limit: 4 }), enabled: ready });
  const firstName = me.data?.name?.trim().split(/\s+/)[0];
  const b = budget.data;

  return (
    <div className="hidden flex-col gap-8 md:flex">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-headline-4 font-bold tracking-[-1.6px]">
          {clock ? greeting(clock.hour) : "Hello"}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <span className="rounded-full border border-border-default px-4 py-2 text-caption font-medium">{month ? monthLabel(month) : ""}</span>
      </div>

      <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <p className="font-heading text-headline-3 font-bold tracking-[-2px]">Snap it. We&apos;ll sort it.</p>

          <div className="flex gap-6">
            <DesktopAction href="/app/receipts/new" title="Snap receipt" subtitle="Photo a receipt, we’ll do the rest" art="3d-camera" primary />
            <DesktopAction href="/app/chat" title="Ask Notarik" subtitle="Ask anything about your spending" art="3d-quick" />
          </div>

          <ul className="flex flex-wrap gap-7">
            {desktopShortcuts.map((tile) => (
              <li key={tile.label}>
                <Link href={tile.href} className="flex flex-col items-center gap-2">
                  <span className="flex size-[76px] items-center justify-center rounded-[22px]" style={{ backgroundColor: tile.tint }}>
                    <Image src={design(`${tile.art}.png`)} alt="" width={52} height={52} className="size-[52px] object-contain" />
                  </span>
                  <span className="text-caption font-medium">{tile.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex gap-6" aria-label="This month in numbers" role="group">
            {budget.isError ? (
              <p role="alert" className="text-caption text-status-danger-text">
                Could not load your budget.
              </p>
            ) : !b ? (
              <Skeleton className="h-[136px] flex-1" />
            ) : (
              <>
                <Stat label="Spent this month" value={formatIdr(b.spent_minor)} note={b.limit_minor === null ? "No budget set" : `of ${formatIdr(b.limit_minor)}`} art="3d-budget" wide />
                <Stat label="Budget used" value={b.limit_minor === null ? "–" : `${Math.round(b.percent_used)}%`} note={b.label} art="3d-recap" />
                <Stat label="Days left" value={String(b.days_left)} note={`in ${monthLabel(month).split(" ")[0]}`} art="3d-receipt" />
              </>
            )}
          </div>

          <section aria-labelledby="try-asking-wide" className="flex flex-col gap-8">
            <h2 id="try-asking-wide" className="text-caption font-medium text-text-secondary">
              Try asking Notarik
            </h2>
            <ul className="flex flex-wrap gap-3">
              {desktopPrompts.map((text) => (
                <li key={text}>
                  <Link href={`/app/chat?prompt=${encodeURIComponent(text)}`} className="block rounded-full border border-border-default px-[18px] py-2.5 text-caption transition-colors hover:bg-surface-subtle">
                    {text}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section aria-labelledby="recent-heading" className="flex w-full shrink-0 flex-col gap-1 rounded-[32px] bg-surface-subtle px-7 py-6 xl:w-[420px]">
          <h2 id="recent-heading" className="text-body-1 font-semibold">
            Recent
          </h2>
          {recent.isPending ? (
            <div aria-busy="true" aria-label="Loading recent expenses" className="flex flex-col gap-3 py-3">
              <Skeleton className="h-12 bg-surface-default" />
              <Skeleton className="h-12 bg-surface-default" />
            </div>
          ) : recent.isError ? (
            <ErrorState message={recent.error.message} onRetry={() => recent.refetch()} />
          ) : recent.data.items.length === 0 ? (
            <EmptyState title="No expenses yet" hint="Press Add expense, or snap a receipt, and it shows up here." />
          ) : (
            <ul className="flex flex-col gap-1">
              {recent.data.items.map((row) => (
                <RecentRow key={row.id} row={row} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export function HomeView() {
  return (
    <>
      <MobileHome />
      <DesktopHome />
    </>
  );
}
