"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getBudget, getCategoryBudgets, getProjection, getRecap } from "@/lib/client";
import { formatIdr } from "@/lib/money";
import { useClock } from "@/lib/useClock";
import { BudgetEditor } from "./BudgetEditor";
import { MonthSwitcher } from "./MonthSwitcher";
import { Card, EmptyState, ErrorState, PageTitle, Skeleton, categoryMeta } from "./ui";

/** Whole-number change versus last month, in words. Integers only: no float money. */
function versusLast(total: number, previous: number): string {
  if (previous === 0) return total === 0 ? "No spending last month either" : "Nothing recorded last month";
  const percent = Math.round(((total - previous) * 100) / previous);
  if (percent === 0) return "Same as last month";
  return `${Math.abs(percent)}% ${percent > 0 ? "more" : "less"} than last month`;
}

function Bar({ percent, className }: { percent: number; className: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-subtle">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} />
    </div>
  );
}

export function RecapView() {
  const clock = useClock();
  const [picked, setMonth] = useState<string>();
  const month = picked ?? clock?.month;
  const enabled = month !== undefined;
  const key = month ?? "";

  const recap = useQuery({ queryKey: ["recap", key], queryFn: () => getRecap(key), enabled });
  const budget = useQuery({ queryKey: ["budget", key], queryFn: () => getBudget(key), enabled });
  const limits = useQuery({ queryKey: ["categoryBudgets", key], queryFn: () => getCategoryBudgets(key), enabled });
  const projection = useQuery({ queryKey: ["projection", key], queryFn: () => getProjection(key), enabled });

  return (
    <>
      <PageTitle aside={month ? <MonthSwitcher month={month} onChange={setMonth} /> : <Skeleton className="h-10 w-56" />}>Recap</PageTitle>

      {recap.isError ? (
        <ErrorState message={recap.error.message} onRetry={() => recap.refetch()} />
      ) : recap.isPending || !month ? (
        <div aria-busy="true" aria-label="Loading recap" className="flex flex-col gap-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-64" />
        </div>
      ) : recap.data.count === 0 ? (
        <EmptyState title="No expenses this month" hint="Your recap fills in as you add expenses." />
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="bg-linear-to-br from-brand-primary to-brand-gradient-to text-text-inverse">
            <p className="text-caption">Spent this month</p>
            <p className="mt-1 font-heading text-headline-4 font-bold">{formatIdr(recap.data.total_minor)}</p>
            <p className="text-caption">
              {recap.data.count} {recap.data.count === 1 ? "expense" : "expenses"} · {versusLast(recap.data.total_minor, recap.data.previous_total_minor)}
            </p>
            {recap.data.insight && <p className="mt-3 rounded-2xl bg-text-inverse/15 px-4 py-2.5 text-caption">{recap.data.insight.text}</p>}
          </Card>

          <Card>
            <h2 className="mb-4 font-heading text-body-1 font-bold">By category</h2>
            <ul className="flex flex-col gap-4">
              {recap.data.categories.map((row) => (
                <li key={row.category} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-body-2">
                    <span className="font-medium">{categoryMeta[row.category].label}</span>
                    <span>
                      {formatIdr(row.total_minor)} <span className="text-caption text-text-secondary">· {Math.round(row.share * 100)}%</span>
                    </span>
                  </div>
                  <Bar percent={row.share * 100} className={categoryMeta[row.category].dot} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-heading text-body-1 font-bold">Budget</h2>
            {month && budget.data && <BudgetEditor month={month} limit={budget.data.limit_minor} />}
          </div>
          {budget.isError ? (
            <p role="alert" className="text-caption text-status-danger">Could not load your budget.</p>
          ) : !budget.data ? (
            <Skeleton className="h-16" />
          ) : budget.data.limit_minor === null ? (
            <p className="text-caption text-text-secondary">No budget for this month. Set one to see how you are doing.</p>
          ) : (
            <>
              <p className="font-heading text-headline-4 font-bold">{formatIdr(budget.data.limit_minor)}</p>
              <Bar
                percent={budget.data.percent_used}
                className={budget.data.status === "over" ? "bg-status-danger" : budget.data.status === "near-limit" ? "bg-status-warning" : "bg-status-success"}
              />
              <p className="text-caption text-text-secondary">
                {budget.data.label} · {budget.data.percent_used}% used ·{" "}
                {budget.data.remaining_minor !== null && budget.data.remaining_minor < 0
                  ? `${formatIdr(-budget.data.remaining_minor)} over`
                  : `${formatIdr(budget.data.remaining_minor ?? 0)} left`}
                {budget.data.days_left > 0 ? ` · ${budget.data.days_left} days left` : ""}
              </p>
            </>
          )}
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="font-heading text-body-1 font-bold">Projection</h2>
          {projection.isError ? (
            <p role="alert" className="text-caption text-status-danger">Could not load the projection.</p>
          ) : !projection.data ? (
            <Skeleton className="h-16" />
          ) : projection.data.projected_minor === null ? (
            <p className="text-caption text-text-secondary">Not enough data yet. It appears after your first expense.</p>
          ) : (
            <>
              <p className="font-heading text-headline-4 font-bold">{formatIdr(projection.data.projected_minor)}</p>
              <p className="text-caption text-text-secondary">
                Estimated total by the end of the month, from day {projection.data.day_index} of {projection.data.days_in_month}. It is an estimate, not a promise.
              </p>
            </>
          )}
        </Card>
      </div>

      {limits.data && limits.data.some((row) => row.limit_minor !== null) && (
        <Card className="mt-4">
          <h2 className="mb-4 font-heading text-body-1 font-bold">Category limits</h2>
          <ul className="flex flex-col gap-4">
            {limits.data
              .filter((row) => row.limit_minor !== null)
              .map((row) => (
                <li key={row.category} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-body-2">
                    <span className="font-medium">{categoryMeta[row.category].label}</span>
                    <span className={row.over_minor ? "text-status-danger" : ""}>
                      {formatIdr(row.spent_minor)} / {formatIdr(row.limit_minor ?? 0)}
                    </span>
                  </div>
                  <Bar percent={row.percent_used ?? 0} className={row.over_minor ? "bg-status-danger" : categoryMeta[row.category].dot} />
                </li>
              ))}
          </ul>
        </Card>
      )}
    </>
  );
}
