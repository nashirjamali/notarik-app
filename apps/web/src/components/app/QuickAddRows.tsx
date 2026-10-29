"use client";

import Image from "next/image";
import { useState } from "react";
import { parseAmount } from "@/lib/amount";
import { formatIdr } from "@/lib/money";
import { dayHeading, today } from "@/lib/months";
import { rowTitle, type Row } from "@/lib/quickAddRows";
import { categoryMeta } from "./ui";

/** The "Notarik understood N expenses" card of Quick add: one line per expense. */
export function QuickAddRows({
  rows,
  asOne,
  onAsOne,
  onPickCategory,
  onRemove,
  onAmount,
}: {
  rows: Row[];
  /** Save everything as one expense with the rows as its items. */
  asOne: boolean;
  onAsOne: (value: boolean) => void;
  onPickCategory: (key: string) => void;
  onRemove: (key: string) => void;
  onAmount: (key: string, total: number | null) => void;
}) {
  const total = rows.reduce((sum, row) => sum + (row.total ?? 0), 0);
  return (
    <section aria-label="Understood expenses" className="flex flex-col gap-3 rounded-3xl bg-surface-subtle px-4 pt-3.5 pb-3 md:bg-surface-default">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-caption-small font-semibold text-brand-primary-strong">
          <Image src="/app-assets/svg/review-mark.svg" alt="" width={12} height={10} unoptimized />
          Notarik understood {rows.length} expenses
        </p>
        <p className="text-caption font-medium">{formatIdr(total)}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <Line key={row.key} row={row} onPickCategory={() => onPickCategory(row.key)} onRemove={() => onRemove(row.key)} onAmount={(value) => onAmount(row.key, value)} />
        ))}
      </ul>
      <div className="flex items-center justify-between gap-4 border-t border-border-default pt-3">
        <div className="flex flex-col">
          <span id="as-one" className="text-caption font-medium">Save as one expense</span>
          <span className="text-caption-small text-text-secondary">{asOne ? "One expense with each line as an item" : `${rows.length} separate expenses`}</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={asOne}
          aria-labelledby="as-one"
          onClick={() => onAsOne(!asOne)}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${asOne ? "bg-brand-primary" : "bg-border-default"}`}
        >
          <span className={`absolute top-1 left-1 size-6 rounded-full bg-surface-default transition-transform ${asOne ? "translate-x-6" : ""}`} />
        </button>
      </div>
    </section>
  );
}

export function CategoryTile({ category }: { category: Row["category"] }) {
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-surface-default md:bg-surface-subtle">
      {category === "Dining" ? (
        <Image src="/app-assets/icons/3d-rice.png" alt="" width={76} height={76} className="size-[38px] object-contain" />
      ) : (
        <span className={`size-5 rounded-full ${categoryMeta[category].dot}`} />
      )}
    </span>
  );
}

function Line({ row, onPickCategory, onRemove, onAmount }: { row: Row; onPickCategory: () => void; onRemove: () => void; onAmount: (total: number | null) => void }) {
  const [typed, setTyped] = useState("");
  const title = rowTitle(row);
  const day = dayHeading(row.date, today());
  // The words stay visible under a place that took the title; a date shows only when it is not today.
  const subtitle = [row.merchant && row.description ? row.description : null, categoryMeta[row.category].label, day === "Today" ? null : day].filter(Boolean).join(" · ");
  return (
    <li className="flex items-center gap-3">
      <button type="button" aria-label={`Change category of ${title}`} onClick={onPickCategory} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <CategoryTile category={row.category} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-caption font-medium">{title}</span>
          <span className="truncate text-caption-small text-text-secondary">{subtitle}</span>
        </span>
      </button>
      {row.total == null ? (
        <input
          aria-label={`Amount of ${title}`}
          placeholder="Add amount"
          inputMode="numeric"
          autoComplete="off"
          value={typed}
          onChange={(event) => {
            setTyped(event.target.value);
            onAmount(parseAmount(event.target.value));
          }}
          className="w-28 rounded-xl border border-status-danger-text bg-surface-default px-2.5 py-1.5 text-caption font-medium outline-none placeholder:text-status-danger-text"
        />
      ) : (
        <span className="text-caption font-medium">{formatIdr(row.total)}</span>
      )}
      <button type="button" aria-label={`Remove ${title}`} onClick={onRemove} className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-default text-caption-small leading-none">
        <span aria-hidden="true">×</span>
      </button>
    </li>
  );
}
