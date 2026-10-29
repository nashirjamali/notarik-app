"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { confirmReceipt, uploadReceipt } from "@/lib/client";
import { formatIdr } from "@/lib/money";
import type { ReceiptRun } from "@/lib/types";
import { useClock } from "@/lib/useClock";
import { TransactionForm } from "./TransactionForm";
import { Card, PageTitle, Skeleton } from "./ui";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "application/pdf"];

/** Upload, check what was read, fix it, confirm. Nothing is saved until the last step. */
export function ScanReceiptView() {
  const router = useRouter();
  const client = useQueryClient();
  const clock = useClock();
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const upload = useMutation({ mutationFn: uploadReceipt });
  const confirm = useMutation({
    mutationFn: ({ id, ...edits }: { id: string } & Parameters<typeof confirmReceipt>[1]) => confirmReceipt(id, edits),
    onSuccess: async ({ transaction_id }) => {
      await client.invalidateQueries();
      router.push(`/app/transactions/${transaction_id}`);
    },
  });

  function pick(file: File | undefined) {
    if (!file) return;
    if (!TYPES.includes(file.type)) return setProblem("Choose a JPEG, PNG or PDF file");
    if (file.size > MAX_BYTES) return setProblem("That file is over 5 MB");
    setProblem(null);
    upload.mutate(file);
  }

  const run: ReceiptRun | undefined = upload.data;
  if (run && clock) {
    const draft = run.draft ?? {};
    const isPdf = run.content_type === "application/pdf";
    return (
      <>
        <PageTitle>Check your receipt</PageTitle>
        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,28rem)]">
          <Card className="flex items-start justify-center">
            {isPdf ? (
              <p className="py-10 text-body-2 text-text-secondary">PDF uploaded. Check the details on the right.</p>
            ) : (
              <>
                {/* The proxy streams the stored file; next/image would only add a second hop. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/proxy/receipts/${run.id}/image`} alt="Your uploaded receipt" className="max-h-[32rem] w-auto rounded-2xl object-contain" />
              </>
            )}
          </Card>
          <Card className="flex flex-col gap-4">
            {run.issues && run.issues.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-2xl bg-status-warning-subtle px-4 py-3 text-caption text-text-primary">
                {run.issues.map((issue) => (
                  <li key={`${issue.code}-${issue.field}`}>{issue.code === "SCHEMA_INVALID" ? "Some details could not be read. Please check them." : issue.detail}</li>
                ))}
              </ul>
            )}
            {!draft.merchant && !draft.total_minor && (
              <p className="text-caption text-text-secondary">We could not read this receipt. Fill in the details yourself.</p>
            )}
            <TransactionForm
              initial={{ merchant: draft.merchant ?? "", total_minor: draft.total_minor ?? 0, date: draft.date ?? clock.today, category: draft.category ?? "Other", note: null }}
              today={clock.today}
              submitLabel="Save expense"
              withPayment={false}
              busy={confirm.isPending}
              error={confirm.error?.message ?? null}
              onSubmit={(values) =>
                confirm.mutate({ id: run.id, merchant: values.merchant, date: values.date, total_minor: values.total_minor, category: values.category, ...(values.note ? { note: values.note } : {}) })
              }
              onCancel={() => upload.reset()}
            />
            {draft.items && draft.items.length > 0 && (
              <div>
                <h2 className="mb-2 font-heading text-body-2 font-bold">Items read from the receipt</h2>
                <ul className="flex flex-col gap-1 text-caption text-text-secondary">
                  {draft.items.map((item, index) => (
                    <li key={index} className="flex justify-between gap-4">
                      <span>{item.name}</span>
                      {item.line_total_minor != null && <span>{formatIdr(item.line_total_minor)}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </>
    );
  }

  const error = problem ?? upload.error?.message ?? null;
  return (
    <>
      <PageTitle>Scan receipt</PageTitle>
      <Card className="flex max-w-xl flex-col gap-4">
        <p className="text-body-2 text-text-secondary">Upload a photo or PDF of a receipt. Notarik reads it, and you check the details before anything is saved.</p>
        <input ref={input} type="file" accept="image/jpeg,image/png,application/pdf" aria-label="Receipt file" className="sr-only" onChange={(event) => pick(event.target.files?.[0])} />
        {upload.isPending ? (
          <div role="status" className="flex flex-col gap-3">
            <p className="text-body-2 font-medium">Reading your receipt…</p>
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="h-12 w-fit rounded-full bg-brand-primary px-8 font-heading text-button-1 font-bold text-text-inverse hover:bg-brand-primary-strong"
          >
            Choose a file
          </button>
        )}
        {error && (
          <p role="alert" className="rounded-2xl bg-status-danger-subtle px-4 py-3 text-caption text-status-danger">
            {error}
          </p>
        )}
        <p className="text-caption-small text-text-secondary">JPEG, PNG or PDF, up to 5 MB.</p>
      </Card>
    </>
  );
}
