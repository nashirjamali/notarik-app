import Link from "next/link";
import { formatIdr } from "@/lib/money";
import type { Transaction } from "@/lib/types";
import { CategoryIcon, categoryMeta } from "./ui";

/** Merchant and note come from receipts and users: they are rendered as text only, never as HTML. */
export function TransactionRow({ row }: { row: Transaction }) {
  return (
    <li>
      <Link href={`/app/transactions/${row.id}`} className="flex items-center gap-3 rounded-2xl py-3 transition-colors hover:bg-surface-subtle md:-mx-2 md:px-2">
      <CategoryIcon category={row.category} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-2 font-medium">{row.merchant}</span>
        <span className="truncate text-caption-small text-text-secondary">
          {categoryMeta[row.category].label}
          {row.payment_method ? ` · ${row.payment_method}` : ""}
        </span>
      </div>
      <span className="shrink-0 text-body-2 font-semibold">{formatIdr(row.total_minor)}</span>
      </Link>
    </li>
  );
}
