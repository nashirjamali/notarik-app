"use client";

import { monthLabel, shiftMonth } from "@/lib/months";
import { useClock } from "@/lib/useClock";

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const clock = useClock();
  const atCurrent = !clock || month >= clock.month;
  const arrow = "flex size-10 items-center justify-center rounded-full bg-surface-default text-text-primary transition-colors hover:bg-border-default disabled:opacity-30 disabled:hover:bg-surface-default";
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Previous month" className={arrow} onClick={() => onChange(shiftMonth(month, -1))}>
        <span aria-hidden="true">‹</span>
      </button>
      <span aria-live="polite" className="min-w-36 text-center font-heading text-body-2 font-bold">
        {monthLabel(month)}
      </span>
      <button type="button" aria-label="Next month" className={arrow} disabled={atCurrent} onClick={() => onChange(shiftMonth(month, 1))}>
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}
