"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { confirmReceipt, uploadReceipt } from "@/lib/client";
import { formatIdr } from "@/lib/money";
import type { ReceiptRun } from "@/lib/types";
import { useClock } from "@/lib/useClock";
import { TransactionForm } from "./TransactionForm";
import Image from "next/image";
import { TopBar } from "./TopBar";
import { Card } from "./ui";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "application/pdf"];

/** Upload, check what was read, fix it, confirm. Nothing is saved until the last step. */
export function ScanReceiptView() {
  const router = useRouter();
  const client = useQueryClient();
  const clock = useClock();
  const gallery = useRef<HTMLInputElement>(null);
  const photo = useRef<HTMLInputElement>(null);
  const pdf = useRef<HTMLInputElement>(null);
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
        <TopBar
          title="Review receipt"
          onBack={() => upload.reset()}
          right={
            <button type="button" onClick={() => upload.reset()} className="self-center text-caption font-medium text-brand-primary-strong">
              Retake
            </button>
          }
        />
        <h1 className="sr-only md:not-sr-only md:mb-6 md:font-heading md:text-headline-4 md:font-bold">Check your receipt</h1>
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
              cancelLabel="Discard"
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
  const svg = (name: string) => `/app-assets/svg/${name}.svg`;
  const side = "flex flex-col items-center gap-1.5 text-caption-small text-text-inverse disabled:opacity-50";
  return (
    <>
      <TopBar title="Scan receipt" onBack={() => router.back()} />
      <h1 className="sr-only md:not-sr-only md:mb-6 md:font-heading md:text-headline-4 md:font-bold">Scan receipt</h1>
      {/* One hidden input per way in: the first is the one tests and assistive tech find by name. */}
      <input ref={gallery} type="file" accept="image/jpeg,image/png,application/pdf" aria-label="Receipt file" className="sr-only" tabIndex={-1} onChange={(event) => pick(event.target.files?.[0])} />
      <input ref={photo} type="file" accept="image/jpeg,image/png" capture="environment" aria-label="Receipt photo" className="sr-only" tabIndex={-1} onChange={(event) => pick(event.target.files?.[0])} />
      <input ref={pdf} type="file" accept="application/pdf" aria-label="Receipt PDF" className="sr-only" tabIndex={-1} onChange={(event) => pick(event.target.files?.[0])} />
      <div className="relative mx-auto flex min-h-[32rem] max-w-xl flex-col justify-between overflow-hidden rounded-3xl bg-text-primary px-6 pt-8 pb-8 text-text-inverse">
        <p className="text-center text-caption">Fit the whole receipt in the frame</p>
        <Image src={svg("snap-corner-brackets")} alt="" width={240} height={320} unoptimized className="mx-auto my-6 h-auto w-3/5 max-w-60 opacity-80" />
        {error && (
          <p role="alert" className="mb-4 rounded-2xl bg-status-danger-subtle px-4 py-3 text-center text-caption text-status-danger-text">
            {error}
          </p>
        )}
        <div className="flex items-end justify-around">
          <button type="button" disabled={upload.isPending} onClick={() => gallery.current?.click()} className={side}>
            <span className="flex size-12 items-center justify-center rounded-xl border-2 border-surface-default bg-surface-default/20" />
            Gallery
          </button>
          <button type="button" aria-label="Take photo" disabled={upload.isPending} onClick={() => photo.current?.click()} className="disabled:opacity-50">
            <Image src={svg("snap-shutter")} alt="" width={72} height={72} unoptimized />
          </button>
          <button type="button" disabled={upload.isPending} onClick={() => pdf.current?.click()} className={side}>
            <span className="flex size-12 items-center justify-center rounded-xl bg-surface-default/20">
              <Image src={svg("snap-file-text")} alt="" width={24} height={24} unoptimized />
            </span>
            PDF
          </button>
        </div>
        <p className="mt-5 text-center text-caption-small opacity-80">JPEG, PNG or PDF, up to 5 MB.</p>
        {upload.isPending && (
          <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-text-primary/80">
            <p className="text-body-2 font-medium">Reading receipt…</p>
          </div>
        )}
      </div>
    </>
  );
}
