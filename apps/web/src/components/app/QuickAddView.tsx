"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createTransaction, createTransactionsBatch } from "@/lib/client";
import { formatIdr } from "@/lib/money";
import { dayHeading, today } from "@/lib/months";
import { MAX_ROWS, parseQuickAdd, splitEntries } from "@/lib/quickAdd";
import { applyEdit, expensesFromRows, groupRows, oneExpense, rowsFromText, type Row, type RowEdit } from "@/lib/quickAddRows";
import { categoryOrder, type Category, type TransactionInput } from "@/lib/types";
import { OptionSheet } from "./OptionSheet";
import { CategoryTile, QuickAddRows } from "./QuickAddRows";
import { TopBar } from "./TopBar";
import { categoryMeta } from "./ui";

function dateChip(date: string, now: Date) {
  const label = dayHeading(date, today(now));
  if (label !== "Today") return label;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `Today, ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/**
 * Quick add: type a sentence ("makan siang 35rb di warteg"), see what Notarik understood, pick the category, save.
 * Several expenses can be typed at once, separated by commas or new lines.
 */
export function QuickAddView() {
  const router = useRouter();
  const client = useQueryClient();
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<Category | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [removed, setRemoved] = useState<Record<string, true>>({});
  const [asOne, setAsOne] = useState(false);
  const [pickingKey, setPickingKey] = useState<string | null>(null);

  const entries = useMemo(() => rowsFromText(text), [text]);
  const cutOff = useMemo(() => splitEntries(text).length > MAX_ROWS, [text]);
  const rows = useMemo(() => entries.filter((row) => !removed[row.key]).map((row) => applyEdit(row, edits[row.key])), [entries, removed, edits]);
  // One expense (or none) is the single-expense card; more than one is the list.
  const many = rows.length > 1;
  const missingAmount = many && rows.some((row) => row.total == null);
  const allRemoved = entries.length > 0 && rows.length === 0;
  const parsed = rows[0] ?? parseQuickAdd(allRemoved ? "" : text);
  const category = picked ?? parsed.category;
  const typed = text.trim().length > 0;
  const now = new Date();
  const pickingRow = rows.find((row) => row.key === pickingKey);

  const done = async (to: string) => {
    await client.invalidateQueries();
    router.replace(to);
  };
  const save = useMutation({
    mutationFn: (input: TransactionInput) => createTransaction(input),
    onSuccess: (created) => done(`/app/transactions/${created.id}`),
    onError: (error: Error) => setMessage(error.message),
  });
  const saveMany = useMutation({
    mutationFn: (inputs: TransactionInput[]) => createTransactionsBatch(inputs),
    onSuccess: () => done("/app/transactions"),
    onError: (error: Error) => setMessage(error.message),
  });
  const busy = save.isPending || saveMany.isPending;

  function submit() {
    if (busy) return;
    if (many) {
      if (missingAmount) return setMessage("Add an amount to the highlighted expenses, or remove them");
      setMessage(null);
      const complete = rows.filter((row): row is Row & { total: number } => row.total != null);
      if (asOne) save.mutate(oneExpense(complete));
      else saveMany.mutate(expensesFromRows(complete));
      return;
    }
    if (allRemoved) return setMessage("Nothing left to save");
    if (parsed.total == null) return setMessage(typed ? "Add an amount, like 35rb or 35.000" : "Type what you spent, like “makan siang 35rb di warteg”");
    setMessage(null);
    save.mutate({
      merchant: parsed.merchant ?? (parsed.description || "Expense"),
      date: parsed.date,
      total_minor: parsed.total,
      category,
      // Keep the words the person used when a merchant took the title.
      note: parsed.merchant && parsed.description ? parsed.description : undefined,
      items: [],
    });
  }

  const expenseCount = groupRows(rows).length;
  const saveLabel = many ? (asOne || expenseCount === 1 ? "Save as one expense" : `Save ${expenseCount} expenses`) : "Save expense";
  const title = parsed.merchant ?? (parsed.description || "Expense");
  const subtitle = parsed.merchant ? parsed.description || categoryMeta[category].label : categoryMeta[category].label;
  const back = () => (window.history.length > 1 ? router.back() : router.replace("/app"));

  return (
    <>
      <TopBar title="Add expense" onBack={back} />
      <div className="flex max-w-xl flex-col gap-5 md:mt-2">
        <h1 className="sr-only md:not-sr-only md:font-heading md:text-headline-4 md:font-bold">Add expense</h1>
        <textarea
          aria-label="What did you spend?"
          autoFocus
          rows={1}
          // The parser reads the exact words typed, so keep the browser from rewriting them.
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          autoComplete="off"
          placeholder="makan siang 35rb di warteg"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setMessage(null);
            event.target.style.height = "auto";
            event.target.style.height = `${event.target.scrollHeight}px`;
          }}
          className="min-h-12 w-full resize-none rounded-xl border-2 border-brand-primary bg-surface-default px-3 py-3 text-body-2 outline-none"
        />

        {many ? (
          <QuickAddRows
            rows={rows}
            asOne={asOne}
            onAsOne={setAsOne}
            onPickCategory={setPickingKey}
            onRemove={(key) => setRemoved((current) => ({ ...current, [key]: true }))}
            onAmount={(key, total) => setEdits((current) => ({ ...current, [key]: { ...current[key], total } }))}
          />
        ) : typed && parsed.total != null ? (
          <section aria-label="Understood expense" className="flex flex-col gap-3 rounded-3xl bg-surface-subtle px-4 pt-3.5 pb-4">
            <p className="flex items-center gap-1.5 text-caption-small font-semibold text-brand-primary-strong">
              <Image src="/app-assets/svg/review-mark.svg" alt="" width={12} height={10} unoptimized />
              Notarik understood
            </p>
            <div className="flex items-center gap-3">
              <CategoryTile category={category} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body-2 font-medium">{title}</span>
                <span className="truncate text-caption-small text-text-secondary">{subtitle}</span>
              </div>
              <span className="text-body-1 font-semibold">{formatIdr(parsed.total)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-surface-default py-1.5 pr-3 pl-2.5 text-caption-small font-semibold">
                <span aria-hidden="true" className={`size-2 rounded-full ${categoryMeta[category].dot}`} />
                {categoryMeta[category].label}
              </span>
              <span className="rounded-full bg-surface-default py-1.5 pr-3 pl-2.5 text-caption-small text-text-secondary">{dateChip(parsed.date, now)}</span>
            </div>
          </section>
        ) : null}

        {message && (
          <p role="alert" className="text-caption text-status-danger-text">
            {message}
          </p>
        )}
        {cutOff && <p className="text-caption-small text-text-secondary">Only the first {MAX_ROWS} expenses are used.</p>}

        {!many && (
          <div role="radiogroup" aria-label="Category" className="flex flex-col gap-2">
            <p className="text-caption-small text-text-secondary">Category</p>
            <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 md:mx-0 md:flex-wrap md:px-0">
              {categoryOrder.map((name) => {
                const selected = name === category;
                const color = `var(--color-category-${name.toLowerCase()})`;
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPicked(name)}
                    style={selected ? { backgroundColor: color, borderColor: color } : undefined}
                    className={`flex shrink-0 items-center gap-2 rounded-full border py-2 pr-3.5 pl-3 text-caption ${selected ? "font-medium text-text-primary" : "border-border-default bg-surface-default"}`}
                  >
                    <span aria-hidden="true" className={`size-2 rounded-full ${selected ? "bg-surface-default" : categoryMeta[name].dot}`} />
                    {categoryMeta[name].label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-caption-small text-text-secondary">Or add another way</p>
          <Link href="/app/receipts/new" className="flex items-center gap-2.5 rounded-[20px] border border-border-default bg-surface-default py-2.5 pr-3 pl-2.5">
            <span className="flex size-11 items-center justify-center rounded-[14px] bg-surface-subtle">
              <Image src="/app-assets/icons/3d-camera.png" alt="" width={68} height={68} className="size-[34px] object-contain" />
            </span>
            <span className="flex flex-col">
              <span className="text-caption font-medium">Snap receipt</span>
              <span className="text-caption-small text-text-secondary">Photo or PDF</span>
            </span>
          </Link>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className={`min-h-12 rounded-xl bg-brand-primary font-heading text-button-1 font-bold text-text-inverse transition-opacity hover:bg-brand-primary-strong ${busy ? "opacity-60" : missingAmount ? "opacity-50" : ""}`}
        >
          {busy ? "Saving…" : saveLabel}
        </button>
      </div>

      <OptionSheet<Category>
        open={pickingKey != null}
        title="Category"
        options={categoryOrder.map((value) => ({ value, label: categoryMeta[value].label, dot: categoryMeta[value].dot }))}
        selected={pickingRow?.category}
        onClose={() => setPickingKey(null)}
        onSelect={(value) => {
          if (pickingKey) setEdits((current) => ({ ...current, [pickingKey]: { ...current[pickingKey], category: value } }));
          setPickingKey(null);
        }}
      />
    </>
  );
}
