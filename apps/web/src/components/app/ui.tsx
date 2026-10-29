import Image from "next/image";
import type { ReactNode } from "react";
import type { Category } from "@/lib/types";
import type { IconName } from "@/components/landing/Icon3d";

export const categoryMeta: Record<Category, { label: string; icon: IconName; dot: string }> = {
  Groceries: { label: "Groceries", icon: "groceries", dot: "bg-category-groceries" },
  Dining: { label: "Food & Drink", icon: "coffee", dot: "bg-category-dining" },
  Transport: { label: "Transport", icon: "transport", dot: "bg-category-transport" },
  Shopping: { label: "Shopping", icon: "quick-add", dot: "bg-category-shopping" },
  Bills: { label: "Bills", icon: "bills", dot: "bg-category-bills" },
  Other: { label: "Other", icon: "receipt", dot: "bg-category-other" },
};

export function CategoryIcon({ category }: { category: Category }) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface-subtle">
      <Image src={`/icons/${categoryMeta[category].icon}.png`} alt="" width={64} height={64} className="size-8 object-contain" />
    </span>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-3xl bg-surface-default p-5 md:p-6 ${className}`}>{children}</div>;
}

export function PageTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-heading text-headline-4 font-bold">{children}</h1>
      {aside}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl bg-border-default ${className}`} />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="flex flex-col items-start gap-3" >
      <p role="alert" className="text-body-2 text-status-danger">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-brand-primary px-5 py-2.5 text-button-2 font-bold text-text-inverse hover:bg-brand-primary-strong"
      >
        Try again
      </button>
    </Card>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <Card className="flex flex-col items-center gap-2 py-12 text-center">
      <Image src="/icons/receipt.png" alt="" width={96} height={96} className="size-16 object-contain opacity-80" />
      <p className="font-heading text-body-1 font-bold">{title}</p>
      <p className="text-caption text-text-secondary">{hint}</p>
    </Card>
  );
}
