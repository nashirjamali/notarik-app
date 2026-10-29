"use client";

import Image from "next/image";
import { monthLabel, shiftMonth } from "@/lib/months";
import { useClock } from "@/lib/useClock";

const chevron = (name: string) => <Image src={`/app-assets/svg/${name}.svg`} alt="" width={20} height={20} unoptimized />;

/** The mobile month switcher: a 32px round button on each side of the month name. */
export function MonthSwitcher({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const clock = useClock();
  const atCurrent = !clock || month >= clock.month;
  const arrow = "flex size-8 items-center justify-center rounded-full bg-surface-subtle transition-colors hover:bg-border-default disabled:opacity-30 disabled:hover:bg-surface-subtle md:bg-surface-subtle";
  return (
    <div className="flex items-center gap-2.5">
      <button type="button" aria-label="Previous month" className={arrow} onClick={() => onChange(shiftMonth(month, -1))}>
        {chevron("list-chevron-left")}
      </button>
      <span aria-live="polite" className="min-w-32 text-center text-body-2 font-medium">
        {monthLabel(month)}
      </span>
      <button type="button" aria-label="Next month" className={arrow} disabled={atCurrent} onClick={() => onChange(shiftMonth(month, 1))}>
        {chevron("list-chevron-right")}
      </button>
    </div>
  );
}
