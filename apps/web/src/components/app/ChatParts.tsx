"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { parseAmount } from "@/lib/amount";
import { splitAmounts, type PendingAction } from "@/lib/chat";
import { formatIdr } from "@/lib/money";
import { dayHeading, monthLabel, today } from "@/lib/months";
import { categories, type Category } from "@/lib/types";
import { categoryMeta } from "./ui";

export type CardState = "open" | "saving" | "approved" | "rejected" | "expired";

export function Avatar() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-accent-subtle">
      <Image src="/app-assets/svg/chat-avatar-mark.svg" alt="" width={18} height={16} unoptimized />
    </span>
  );
}

/** An assistant message. Amounts inside the text are set heavier; the text itself is never HTML. */
export function AiBubble({ text, children }: { text?: string; children?: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Avatar />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        {text != null && (
          <p className="max-w-[85%] rounded-[20px] bg-surface-subtle px-4 py-3 text-body-2 break-words whitespace-pre-wrap">
            {splitAmounts(text).map((part, index) => (part.amount ? <strong key={index} className="font-medium">{part.text}</strong> : <span key={index}>{part.text}</span>))}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

export function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] rounded-[20px] border-2 border-border-default bg-surface-default px-4 py-3 text-body-2 break-words whitespace-pre-wrap">{text}</p>
    </div>
  );
}

export function TypingBubble() {
  return (
    <AiBubble>
      <p aria-label="Notarik is typing" className="flex min-h-12 items-center gap-1 rounded-[20px] bg-surface-subtle px-4 py-3">
        {[0, 1, 2].map((n) => (
          <span key={n} aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-text-secondary" style={{ animationDelay: `${n * 150}ms` }} />
        ))}
      </p>
    </AiBubble>
  );
}

function titleOf(pending: PendingAction) {
  if (pending.kind === "create_expense") return pending.payload.merchant || pending.payload.items[0]?.name || "Expense";
  if (pending.kind === "delete_expense") return `Delete ${pending.payload.merchant ?? "this expense"}?`;
  return `${monthLabel(pending.payload.month)} budget`;
}

const input = "min-w-0 bg-transparent outline-none";

/** The proposal the assistant wants confirmed. Nothing is saved until Save (or Delete, Set budget) is pressed. */
export function ProposalCard({
  pending,
  state,
  at,
  error,
  onApprove,
  onReject,
  onEdit,
}: {
  pending: PendingAction;
  state: CardState;
  at: Date;
  error?: string | null;
  onApprove: () => void;
  onReject: () => void;
  onEdit: (payload: Record<string, unknown>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const expense = pending.kind === "create_expense" ? pending.payload : null;
  const title = titleOf(pending);
  const [name, setName] = useState(expense?.merchant ?? expense?.items[0]?.name ?? "");
  const [amount, setAmount] = useState(expense?.total_minor != null ? String(expense.total_minor) : "");
  const [category, setCategory] = useState<Category>(expense?.category ?? "Other");
  const [editError, setEditError] = useState<string | null>(null);

  const total = pending.kind === "delete_expense" ? null : pending.payload.total_minor;
  const shown: Category = editing ? category : (expense?.category ?? "Other");
  const subtitle = expense?.merchant && expense.items[0]?.name ? expense.items[0].name : null;
  const dateChip = (() => {
    if (!expense?.date) return null;
    const label = dayHeading(expense.date, today(at));
    if (label !== "Today") return label;
    const pad = (value: number) => String(value).padStart(2, "0");
    return `Today, ${pad(at.getHours())}:${pad(at.getMinutes())}`;
  })();
  const coffee = /\b(kopi|coffee|latte|americano|teh)\b/i.test(title);
  const decided = state === "approved" || state === "rejected" || state === "expired";
  const busy = state === "saving";

  function saveEdit() {
    const parsed = parseAmount(amount);
    if (parsed == null) return setEditError("Enter an amount like 25000 or 25rb");
    setEditError(null);
    // The total changed by hand, so the original line items no longer describe it.
    onEdit({ merchant: name.trim() || null, total_minor: parsed, category, items: [] });
  }

  const primary = pending.kind === "create_expense" ? "Save" : pending.kind === "delete_expense" ? "Delete" : "Set budget";
  const secondary = pending.kind === "create_expense" ? (editing ? "Cancel" : "Edit") : "Cancel";
  const action = "flex min-h-10 flex-1 items-center justify-center rounded-xl px-4 py-3 font-heading text-button-2 font-bold disabled:opacity-60";

  return (
    <div className="flex w-full max-w-sm flex-col gap-3.5 rounded-3xl border border-border-default bg-surface-default p-4 shadow-[0_8px_12px_rgb(20_23_23/0.06)]">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-status-warning-subtle">
          {expense && coffee ? (
            <Image src="/app-assets/icons/3d-coffee.png" alt="" width={80} height={80} className="size-10 object-contain" />
          ) : expense && shown === "Dining" ? (
            <Image src="/app-assets/icons/3d-rice.png" alt="" width={80} height={80} className="size-10 object-contain" />
          ) : (
            <span className={`size-5 rounded-full ${categoryMeta[shown].dot}`} />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          {editing ? (
            <input aria-label="Merchant" value={name} onChange={(event) => setName(event.target.value)} placeholder="Merchant" autoComplete="off" className={`${input} text-body-2 font-medium`} />
          ) : (
            <span className="truncate text-body-2 font-medium">{title}</span>
          )}
          {subtitle && !editing && <span className="truncate text-caption-small text-text-secondary">{subtitle}</span>}
        </div>
        {editing ? (
          <input aria-label="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Rp 0" inputMode="numeric" autoComplete="off" className={`${input} w-28 text-right text-body-1 font-semibold`} />
        ) : total != null ? (
          <span className="text-body-1 font-semibold">{formatIdr(total)}</span>
        ) : null}
      </div>

      {expense &&
        (editing ? (
          <div role="radiogroup" aria-label="Category" className="flex flex-wrap gap-2">
            {categories.map((value) => {
              const selected = value === category;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setCategory(value)}
                  style={selected ? { backgroundColor: `var(--color-category-${value.toLowerCase()})` } : undefined}
                  className={`flex items-center gap-1.5 rounded-full py-1.5 pr-3 pl-2.5 text-caption-small font-semibold ${selected ? "text-text-primary" : "bg-surface-subtle"}`}
                >
                  <span aria-hidden="true" className={`size-2 rounded-full ${selected ? "bg-surface-default" : categoryMeta[value].dot}`} />
                  {categoryMeta[value].label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-surface-subtle py-1.5 pr-3 pl-2.5 text-caption-small font-semibold">
              <span aria-hidden="true" className={`size-2 rounded-full ${categoryMeta[shown].dot}`} />
              {categoryMeta[shown].label}
            </span>
            {dateChip && <span className="rounded-full bg-surface-subtle py-1.5 pr-3 pl-2.5 text-caption-small text-text-secondary">{dateChip}</span>}
          </div>
        ))}

      {(editError || error) && (
        <p role="alert" className="text-caption-small text-status-danger-text">
          {editError ?? error}
        </p>
      )}
      {decided ? (
        <p className="text-caption-small text-text-secondary">{state === "approved" ? "Saved" : state === "rejected" ? "Not saved" : "Replaced by a newer request"}</p>
      ) : (
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => (pending.kind !== "create_expense" ? onReject() : setEditing((value) => !value))} className={`${action} bg-surface-subtle`}>
            {secondary}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => (editing ? saveEdit() : onApprove())}
            className={`${action} text-text-inverse ${pending.kind === "delete_expense" ? "bg-status-danger-text" : "bg-brand-primary hover:bg-brand-primary-strong"}`}
          >
            {busy ? "Saving…" : primary}
          </button>
        </div>
      )}
    </div>
  );
}
