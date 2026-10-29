"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { deleteTransaction, getTransaction, updateTransaction } from "@/lib/client";
import { formatIdr } from "@/lib/money";
import { dayHeading } from "@/lib/months";
import { useClock } from "@/lib/useClock";
import { TransactionForm } from "./TransactionForm";
import { CategoryIcon, Card, ErrorState, PageTitle, Skeleton, categoryMeta } from "./ui";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 text-body-2">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

export function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const clock = useClock();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const query = useQuery({ queryKey: ["transaction", id], queryFn: () => getTransaction(id) });
  const save = useMutation({
    mutationFn: (values: Parameters<typeof updateTransaction>[1]) => updateTransaction(id, values),
    onSuccess: async () => {
      await client.invalidateQueries();
      setEditing(false);
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteTransaction(id),
    onSuccess: async () => {
      router.replace("/app/transactions");
      client.removeQueries({ queryKey: ["transaction", id] });
      await client.invalidateQueries();
    },
  });

  const back = (
    <Link href="/app/transactions" className="text-caption font-medium text-brand-primary-strong hover:underline">
      ← Transactions
    </Link>
  );

  if (query.isPending || !clock) {
    return (
      <>
        <PageTitle>Expense</PageTitle>
        <Skeleton className="h-72 max-w-xl" />
      </>
    );
  }
  if (query.isError) {
    const gone = "status" in query.error && query.error.status === 404;
    return (
      <>
        <PageTitle aside={back}>Expense</PageTitle>
        {gone ? <Card>This expense does not exist or was deleted.</Card> : <ErrorState message={query.error.message} onRetry={() => query.refetch()} />}
      </>
    );
  }

  const row = query.data;
  return (
    <>
      <PageTitle aside={back}>{editing ? "Edit expense" : row.merchant}</PageTitle>
      <Card className="max-w-xl">
        {editing ? (
          <TransactionForm
            initial={row}
            today={clock.today}
            submitLabel="Save changes"
            busy={save.isPending}
            error={save.error?.message ?? null}
            onSubmit={(values) => save.mutate(values)}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <div className="mb-2 flex items-center gap-4">
              <CategoryIcon category={row.category} />
              <p className="font-heading text-headline-4 font-bold">{formatIdr(row.total_minor)}</p>
            </div>
            <dl className="divide-y divide-border-default">
              <Row label="Date">{dayHeading(row.date, clock.today)}</Row>
              <Row label="Category">{categoryMeta[row.category].label}</Row>
              <Row label="Payment">{row.payment_method ?? "Not set"}</Row>
              <Row label="Added by">{row.source === "manual" ? "Typed in" : row.source === "chat" ? "Chat" : "Receipt"}</Row>
              {row.note && <Row label="Note">{row.note}</Row>}
            </dl>
            {row.items.length > 0 && (
              <div className="mt-4">
                <h2 className="mb-1 font-heading text-body-2 font-bold">Items</h2>
                <ul className="divide-y divide-border-default">
                  {row.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-4 py-2 text-body-2">
                      <span className="min-w-0 truncate">{item.qty && item.qty !== "1" ? `${item.qty} × ` : ""}{item.name}</span>
                      <span className="shrink-0">{formatIdr(item.line_total_minor)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setEditing(true)} className="h-12 rounded-full bg-brand-primary px-8 font-heading text-button-1 font-bold text-text-inverse hover:bg-brand-primary-strong">
                Edit
              </button>
              {confirming ? (
                <>
                  <button
                    type="button"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate()}
                    className="h-12 rounded-full bg-status-danger px-6 font-heading text-button-1 font-bold text-text-inverse disabled:opacity-60"
                  >
                    Confirm delete
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} className="h-12 rounded-full px-5 font-heading text-button-1 font-bold text-text-secondary hover:bg-surface-subtle">
                    Keep it
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirming(true)} className="h-12 rounded-full px-6 font-heading text-button-1 font-bold text-status-danger hover:bg-status-danger-subtle">
                  Delete
                </button>
              )}
            </div>
            {remove.isError && (
              <p role="alert" className="mt-3 text-caption text-status-danger">
                {remove.error.message}
              </p>
            )}
          </>
        )}
      </Card>
    </>
  );
}
