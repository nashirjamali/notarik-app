"use client";

import { useState, type FormEvent } from "react";
import { parseAmount } from "@/lib/amount";
import { formatIdr } from "@/lib/money";
import { categories, paymentMethods, type Category, type PaymentMethod, type Transaction, type TransactionInput } from "@/lib/types";
import { categoryMeta } from "./ui";

const field =
  "w-full rounded-2xl border border-border-default bg-surface-default px-4 py-3 text-body-2 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-accent";

export type FormValues = Omit<TransactionInput, "items">;
type Initial = Pick<Transaction, "merchant" | "total_minor" | "date" | "category" | "payment_method" | "note">;

/** Create and edit share one form. The amount is typed as text ("25rb") and parsed to integer rupiah. */
export function TransactionForm({
  initial,
  today,
  submitLabel,
  busy,
  error,
  onSubmit,
  onCancel,
  withPayment = true,
}: {
  initial?: Partial<Initial>;
  today: string;
  submitLabel: string;
  busy: boolean;
  error: string | null;
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
  /** A receipt confirmation has no payment method to send. */
  withPayment?: boolean;
}) {
  const [problem, setProblem] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const merchant = String(data.get("merchant") ?? "").trim();
    const total = parseAmount(String(data.get("amount") ?? ""));
    const date = String(data.get("date") ?? "");
    if (!merchant) return setProblem("Enter where you spent it");
    if (total === null || total <= 0) return setProblem("Enter an amount like 25rb or 25.000");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setProblem("Pick a date");
    setProblem(null);
    const payment = String(data.get("payment") ?? "");
    const note = String(data.get("note") ?? "").trim();
    onSubmit({
      merchant,
      total_minor: total,
      date,
      category: String(data.get("category")) as Category,
      payment_method: payment ? (payment as PaymentMethod) : null,
      note: note || null,
    });
  }

  const shown = problem ?? error;
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-caption font-medium">
        Merchant
        <input name="merchant" required maxLength={200} defaultValue={initial?.merchant} className={field} />
      </label>
      <label className="flex flex-col gap-1.5 text-caption font-medium">
        Amount
        <input
          name="amount"
          inputMode="text"
          autoComplete="off"
          placeholder="e.g. 25rb"
          defaultValue={initial?.total_minor ? formatIdr(initial.total_minor).replace("Rp ", "") : ""}
          className={field}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-caption font-medium">
          Date
          <input name="date" type="date" required defaultValue={initial?.date ?? today} className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-caption font-medium">
          Category
          <select name="category" defaultValue={initial?.category ?? "Dining"} className={field}>
            {categories.map((value) => (
              <option key={value} value={value}>
                {categoryMeta[value].label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {withPayment && (
      <label className="flex flex-col gap-1.5 text-caption font-medium">
        Payment method
        <select name="payment" defaultValue={initial?.payment_method ?? ""} className={field}>
          <option value="">Not set</option>
          {paymentMethods.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      )}
      <label className="flex flex-col gap-1.5 text-caption font-medium">
        Note
        <textarea name="note" rows={2} maxLength={500} defaultValue={initial?.note ?? ""} className={field} />
      </label>
      {shown && (
        <p role="alert" className="rounded-2xl bg-status-danger-subtle px-4 py-3 text-caption text-status-danger">
          {shown}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="h-12 rounded-full bg-brand-primary px-8 font-heading text-button-1 font-bold text-text-inverse hover:bg-brand-primary-strong disabled:opacity-60"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="h-12 rounded-full px-6 font-heading text-button-1 font-bold text-text-secondary hover:bg-surface-subtle">
          Cancel
        </button>
      </div>
    </form>
  );
}
