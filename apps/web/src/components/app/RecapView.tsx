"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getBudget, getCategoryBudgets, getProjection, getRecap } from "@/lib/client";
import { formatIdr } from "@/lib/money";
import { useClock } from "@/lib/useClock";
import { MonthSwitcher } from "./MonthSwitcher";
import { TopBar } from "./TopBar";
import { CategoryIcon, Card, EmptyState, ErrorState, Skeleton, categoryMeta } from "./ui";

const RING = 112;
const STROKE = 12;
const RADIUS = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** The budget ring of the mobile Recap: a track and an arc that starts at the top. */
function BudgetRing({ percent, over }: { percent: number | null; over: boolean }) {
  const filled = Math.min(Math.max(percent ?? 0, 0), 100) / 100;
  return (
    <div className="relative shrink-0" style={{ width: RING, height: RING }}>
      <svg width={RING} height={RING} aria-hidden="true">
        <circle cx={RING / 2} cy={RING / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-surface-default" />
        {filled > 0 && (
          <circle
            cx={RING / 2}
            cy={RING / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE * filled} ${CIRCUMFERENCE}`}
            transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            className={over ? "stroke-status-warning" : "stroke-brand-primary"}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {percent == null ? (
          <span className="text-caption-small text-text-secondary">No budget</span>
        ) : (
          <>
            <span className="text-body-2 font-medium">{percent}%</span>
            <span className="text-caption-small text-text-secondary">used</span>
          </>
        )}
      </div>
    </div>
  );
}

/** Recap & Budget: this month's spending against the budget, and every category against its limit. */
export function RecapView() {
  const router = useRouter();
  const clock = useClock();
  const [picked, setMonth] = useState<string>();
  const month = picked ?? clock?.month;
  const enabled = month !== undefined;
  const key = month ?? "";

  const recap = useQuery({ queryKey: ["recap", key], queryFn: () => getRecap(key), enabled });
  const budget = useQuery({ queryKey: ["budget", key], queryFn: () => getBudget(key), enabled });
  const limits = useQuery({ queryKey: ["categoryBudgets", key], queryFn: () => getCategoryBudgets(key), enabled });
  const projection = useQuery({ queryKey: ["projection", key], queryFn: () => getProjection(key), enabled });

  const failed = recap.isError || budget.isError || limits.isError;
  const total = recap.data?.total_minor ?? 0;
  const limit = budget.data?.limit_minor ?? null;
  const percent = limit ? (budget.data?.percent_used ?? 0) : null;
  const over = (percent ?? 0) > 100;
  const daysLeft = budget.data?.days_left ?? 0;
  const back = () => (window.history.length > 1 ? router.back() : router.replace("/app"));

  return (
    <>
      <TopBar title="Recap & Budget" onBack={back} />
      <div className="mx-auto flex max-w-xl flex-col gap-4 md:max-w-3xl">
        <h1 className="sr-only md:not-sr-only md:font-heading md:text-headline-4 md:font-bold">Recap &amp; Budget</h1>
        <div className="flex justify-center md:justify-start">{month ? <MonthSwitcher month={month} onChange={setMonth} /> : <Skeleton className="h-8 w-48" />}</div>

        {failed ? (
          <ErrorState message="Could not load this month" onRetry={() => { void recap.refetch(); void budget.refetch(); void limits.refetch(); }} />
        ) : !recap.data || !budget.data || !limits.data ? (
          <div aria-busy="true" aria-label="Loading recap" className="flex flex-col gap-4">
            <Skeleton className="h-36" />
            <Skeleton className="h-64" />
          </div>
        ) : (
          <>
            {recap.data.insight && (
              <div className="flex items-center gap-2.5 rounded-[20px] bg-brand-accent-subtle py-3 pr-4 pl-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-default">
                  <Image src="/app-assets/svg/chat-avatar-mark.svg" alt="" width={18} height={16} unoptimized />
                </span>
                <p className="text-caption">{recap.data.insight.text}</p>
              </div>
            )}

            <section aria-label="Budget" className="flex items-center gap-5 rounded-3xl bg-surface-subtle p-5 md:bg-surface-default">
              <BudgetRing percent={percent} over={over} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-caption-small text-text-secondary">Spent this month</span>
                <span className="text-body-1 font-semibold">{formatIdr(total)}</span>
                <span className="text-caption-small text-text-secondary">{limit ? `of ${formatIdr(limit)}` : "No monthly budget set"}</span>
                {daysLeft > 0 && (
                  <span className="mt-1.5 w-fit rounded-full bg-surface-default px-2.5 py-1 text-caption-small font-semibold md:bg-surface-subtle">
                    {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                  </span>
                )}
              </div>
            </section>

            <section aria-labelledby="by-category" className="flex flex-col gap-1">
              <h2 id="by-category" className="text-caption-small font-semibold text-text-secondary">
                By category
              </h2>
              {limits.data.length === 0 && <EmptyState title="No spending this month yet" hint="Your recap fills in as you add expenses." />}
              <ul>
                {limits.data.map((row) => {
                  const isOver = (row.over_minor ?? 0) > 0;
                  const ratio = row.limit_minor ? Math.min(row.spent_minor / row.limit_minor, 1) : total > 0 ? row.spent_minor / total : 0;
                  return (
                    <li key={row.category} className="flex items-center gap-3 py-3">
                      <CategoryIcon category={row.category} />
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-caption font-medium">{categoryMeta[row.category].label}</span>
                          <span className="flex items-center gap-1">
                            <span className="text-caption-small font-semibold">{formatIdr(row.spent_minor)}</span>
                            {isOver ? (
                              <span className="rounded-full bg-status-warning-subtle px-2 py-0.5 text-caption-small font-semibold text-text-primary">{formatIdr(row.over_minor ?? 0)} over</span>
                            ) : row.limit_minor ? (
                              <span className="text-caption-small text-text-secondary">of {formatIdr(row.limit_minor)}</span>
                            ) : null}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-subtle">
                          <div className={`h-full rounded-full ${isOver ? "bg-status-warning" : categoryMeta[row.category].dot}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* The mobile app has no projection; the wide layout keeps it. */}
            {projection.data && projection.data.projected_minor !== null && (
              <Card className="hidden flex-col gap-1 md:flex">
                <h2 className="font-heading text-body-2 font-bold">Projection</h2>
                <p className="font-heading text-headline-4 font-bold">{formatIdr(projection.data.projected_minor)}</p>
                <p className="text-caption text-text-secondary">
                  Estimated total by the end of the month, from day {projection.data.day_index} of {projection.data.days_in_month}. It is an estimate, not a promise.
                </p>
              </Card>
            )}
          </>
        )}

        <Link href={`/app/recap/edit?month=${key}`} aria-disabled={!enabled} className="flex min-h-12 items-center justify-center rounded-xl bg-surface-subtle font-heading text-button-1 font-bold md:bg-brand-primary md:text-text-inverse md:hover:bg-brand-primary-strong">
          Edit budgets
        </Link>
      </div>
    </>
  );
}
