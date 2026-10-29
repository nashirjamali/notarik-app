import Image from "next/image";
import Link from "next/link";
import { formatIdr } from "@/lib/money";
import { timeOf } from "@/lib/months";
import type { Transaction } from "@/lib/types";
import { CategoryIcon, categoryMeta } from "./ui";

/** Merchant and note come from receipts and users: they are rendered as text only, never as HTML. */
export function TransactionRow({ row }: { row: Transaction }) {
  const fromReceipt = row.source === "photo" || row.source === "pdf";
  const time = timeOf(row.created_at);
  return (
    <li>
      <Link href={`/app/transactions/${row.id}`} className="flex items-center gap-3 rounded-2xl py-2 transition-colors hover:bg-surface-subtle md:-mx-2 md:px-2">
        <CategoryIcon category={row.category} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-caption font-medium">{row.merchant}</span>
            {fromReceipt && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-accent-subtle py-0.5 pr-2 pl-1.5 text-caption-small font-semibold text-brand-primary-strong">
                <Image src="/app-assets/svg/review-mark.svg" alt="" width={12} height={10} unoptimized />
                From receipt
              </span>
            )}
          </span>
          <span className="truncate text-caption-small text-text-secondary">
            {categoryMeta[row.category].label}
            {time ? ` · ${time}` : ""}
          </span>
        </div>
        <span className="shrink-0 text-caption font-medium">{formatIdr(row.total_minor)}</span>
      </Link>
    </li>
  );
}
