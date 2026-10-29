"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { parseAmount } from "@/lib/amount";
import { getBudget, getCategoryBudgets, putBudget, putCategoryBudget } from "@/lib/client";
import { formatIdr } from "@/lib/money";
import { monthLabel } from "@/lib/months";
import { categories, type Category } from "@/lib/types";
import { useClock } from "@/lib/useClock";
import { TopBar } from "./TopBar";
import { Skeleton, categoryMeta } from "./ui";

const field = "h-12 w-full rounded-2xl bg-surface-subtle px-4 text-caption outline-none focus:ring-2 focus:ring-brand-accent";

/** Edit the monthly budget and one limit per category. An empty field means no limit. */
export function EditBudgetsView() {
  const router = useRouter();
  const client = useQueryClient();
  const clock = useClock();
  const asked = useSearchParams().get("month");
  const month = asked && /^\d{4}-\d{2}$/.test(asked) ? asked : clock?.month;
  const budget = useQuery({ queryKey: ["budget", month], queryFn: () => getBudget(month!), enabled: !!month });
  const rows = useQuery({ queryKey: ["categoryBudgets", month], queryFn: () => getCategoryBudgets(month!), enabled: !!month });

  // Only what the person typed is kept here; a field they did not touch shows what is saved.
  const [totalEdit, setTotalEdit] = useState<string | null>(null);
  const [limitEdits, setLimitEdits] = useState<Partial<Record<Category, string>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loaded = budget.data != null && rows.data != null;
  const savedTotal = budget.data?.limit_minor ?? null;
  const savedLimit = (category: Category) => rows.data?.find((row) => row.category === category)?.limit_minor ?? null;
  const total = totalEdit ?? (savedTotal ? String(savedTotal) : "");
  const limitText = (category: Category) => limitEdits[category] ?? (savedLimit(category) != null ? String(savedLimit(category)) : "");
  const back = () => (window.history.length > 1 ? router.back() : router.replace("/app/recap"));

  async function save() {
    if (saving || !loaded || !month) return;
    const parsedTotal = total.trim() === "" ? 0 : parseAmount(total);
    if (parsedTotal == null) return setError("Enter the monthly budget like 4000000 or 4jt");
    const changes: { category: Category; value: number | null }[] = [];
    for (const category of categories) {
      const raw = limitText(category).trim();
      const value = raw === "" ? null : parseAmount(raw);
      if (raw !== "" && value == null) return setError(`Enter ${categoryMeta[category].label} like 500000 or 500rb`);
      if (value !== savedLimit(category)) changes.push({ category, value });
    }
    setError(null);
    setSaving(true);
    try {
      if (parsedTotal !== (savedTotal ?? 0)) await putBudget(month, parsedTotal);
      for (const change of changes) await putCategoryBudget(month, change.category, change.value);
      await client.invalidateQueries();
      back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      setSaving(false);
    }
  }

  return (
    <>
      <TopBar title="Edit budgets" onBack={back} />
      <div className="flex max-w-xl flex-col gap-3.5">
        <div className="flex flex-col md:mb-2">
          <h1 className="sr-only md:not-sr-only md:font-heading md:text-headline-4 md:font-bold">Edit budgets</h1>
          {month && <p className="text-center text-caption-small text-text-secondary md:text-left">{monthLabel(month)}</p>}
        </div>
        {!loaded ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <label className="flex flex-col gap-1.5 text-caption-small text-text-secondary">
              Monthly budget
              <input aria-label="Monthly budget" inputMode="numeric" autoComplete="off" placeholder="No limit" value={total} onChange={(event) => setTotalEdit(event.target.value)} className={field} />
            </label>
            <p className="text-caption-small font-semibold text-text-secondary">By category</p>
            {categories.map((category) => {
              const raw = limitText(category);
              const parsed = raw === "" ? null : parseAmount(raw);
              return (
                <label key={category} className="flex flex-col gap-1.5 text-caption">
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className={`size-2 rounded-full ${categoryMeta[category].dot}`} />
                    {categoryMeta[category].label}
                  </span>
                  <input
                    aria-label={`${categoryMeta[category].label} budget`}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="No limit"
                    value={raw}
                    onChange={(event) => setLimitEdits((current) => ({ ...current, [category]: event.target.value }))}
                    className={field}
                  />
                  {parsed != null && <span className="text-caption-small text-text-secondary">{formatIdr(parsed)}</span>}
                </label>
              );
            })}
            {error && (
              <p role="alert" className="text-caption text-status-danger-text">
                {error}
              </p>
            )}
            <button type="button" onClick={() => void save()} disabled={saving} className={`min-h-12 rounded-xl bg-brand-primary font-heading text-button-1 font-bold text-text-inverse hover:bg-brand-primary-strong ${saving ? "opacity-60" : ""}`}>
              {saving ? "Saving…" : "Save budgets"}
            </button>
          </>
        )}
      </div>
    </>
  );
}
