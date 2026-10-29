import Image from "next/image";
import type { ReactNode } from "react";
import type { Category } from "@/lib/types";

export const categoryMeta: Record<Category, { label: string; dot: string }> = {
  Groceries: { label: "Groceries", dot: "bg-category-groceries" },
  Dining: { label: "Food & Drink", dot: "bg-category-dining" },
  Transport: { label: "Transport", dot: "bg-category-transport" },
  Shopping: { label: "Shopping", dot: "bg-category-shopping" },
  Bills: { label: "Bills", dot: "bg-category-bills" },
  Other: { label: "Other", dot: "bg-category-other" },
};

/** Only four categories have a 3D icon in the design; Shopping and Other show their colour. */
const threeD: Partial<Record<Category, string>> = {
  Dining: "3d-coffee",
  Groceries: "3d-groceries",
  Transport: "3d-transport",
  Bills: "3d-bills",
};

export function CategoryIcon({ category }: { category: Category }) {
  const art = threeD[category];
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-surface-subtle">
      {art ? (
        <Image src={`/app-assets/icons/${art}.png`} alt="" width={72} height={72} className="size-9 object-contain" />
      ) : (
        <span className={`size-4.5 rounded-full ${categoryMeta[category].dot}`} />
      )}
    </span>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-3xl bg-surface-subtle p-5 md:bg-surface-default md:p-6 ${className}`}>{children}</div>;
}

export function PageTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      {/* Mobile layout: the centered title of the mobile "Top Bar". From 768px a left-aligned page heading. */}
      <h1 className="w-full text-center text-body-2 font-medium md:w-auto md:text-left md:font-heading md:text-headline-4 md:font-bold">{children}</h1>
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
