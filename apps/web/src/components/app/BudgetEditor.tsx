"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { parseAmount } from "@/lib/amount";
import { putBudget } from "@/lib/client";
import { formatIdr } from "@/lib/money";

/** Sets this month's total budget. Accepts "5jt", "5.000.000" and the like. */
export function BudgetEditor({ month, limit }: { month: string; limit: number | null }) {
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (total: number) => putBudget(month, total),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["budget"] });
      await client.invalidateQueries({ queryKey: ["categoryBudgets"] });
      setEditing(false);
    },
    onError: (e) => setError(e.message),
  });

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-full bg-brand-accent-subtle px-4 py-2 text-button-2 font-bold text-brand-primary-strong hover:bg-brand-accent"
      >
        {limit === null ? "Set budget" : "Edit budget"}
      </button>
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = parseAmount(String(new FormData(event.currentTarget).get("budget") ?? ""));
    if (amount === null) return setError("Enter an amount like 5jt or 5.000.000");
    setError(null);
    save.mutate(amount);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="budget">
          Monthly budget
        </label>
        <input
          id="budget"
          name="budget"
          inputMode="text"
          autoFocus
          defaultValue={limit === null ? "" : formatIdr(limit).replace("Rp ", "")}
          placeholder="e.g. 5jt"
          className="w-40 rounded-2xl border border-border-default bg-surface-default px-4 py-2.5 text-body-2 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-accent"
        />
        <button
          type="submit"
          disabled={save.isPending}
          className="rounded-full bg-brand-primary px-5 py-2.5 text-button-2 font-bold text-text-inverse hover:bg-brand-primary-strong disabled:opacity-60"
        >
          Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className="rounded-full px-4 py-2.5 text-button-2 font-bold text-text-secondary hover:bg-surface-subtle">
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="text-caption text-status-danger">
          {error}
        </p>
      )}
    </form>
  );
}
