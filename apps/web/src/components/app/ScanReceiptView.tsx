"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [camera, setCamera] = useState<"off" | "starting" | "on">("off");
  // The shutter works once the preview shows a frame; before that there is nothing to capture.
  const [frameReady, setFrameReady] = useState(false);
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

  function stopCamera() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setFrameReady(false);
    setCamera("off");
  }

  // The camera light must go off when the page is left.
  useEffect(() => () => stream.current?.getTracks().forEach((track) => track.stop()), []);

  useEffect(() => {
    if (camera !== "on" || !video.current || !stream.current) return;
    video.current.srcObject = stream.current;
    void video.current.play().catch(() => {});
  }, [camera]);

  /** A live preview in the page on a computer. A phone's native camera (the file input's `capture`) gives a better photo, so it keeps that. */
  async function openCamera() {
    setProblem(null);
    if (window.matchMedia?.("(pointer: coarse)").matches || !navigator.mediaDevices?.getUserMedia) return photo.current?.click();
    setCamera("starting");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false });
      setCamera("on");
    } catch (error) {
      setCamera("off");
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") setProblem("Camera access is blocked. Allow it in your browser, or choose a file from Gallery.");
      else photo.current?.click(); // No camera on this device: fall back to choosing a photo.
    }
  }

  function takePhoto() {
    const frame = video.current;
    if (!frame || !frame.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = frame.videoWidth;
    canvas.height = frame.videoHeight;
    canvas.getContext("2d")?.drawImage(frame, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return setProblem("Could not take the photo. Try again.");
        stopCamera();
        pick(new File([blob], "receipt.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
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
                {!!draft.discount_minor && (
                  <p className="mt-2 flex justify-between gap-4 text-caption font-medium text-status-success-text">
                    <span>Discount</span>
                    <span>−{formatIdr(draft.discount_minor)}</span>
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      </>
    );
  }

  const error = problem ?? upload.error?.message ?? null;
  const svg = (name: string) => `/app-assets/svg/${name}.svg`;
  const alert = error && (
    <p role="alert" className="w-full rounded-2xl bg-status-danger-subtle px-4 py-3 text-center text-caption text-status-danger-text">
      {error}
    </p>
  );
  const reading = upload.isPending && (
    <div role="status" className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-text-primary/80 text-text-inverse">
      <p className="text-body-2 font-medium">Reading receipt…</p>
    </div>
  );
  const option = "flex h-[52px] w-full items-center justify-center rounded-full font-heading text-button-1 font-bold transition-colors disabled:opacity-50";
  return (
    <>
      <TopBar title="Scan receipt" onBack={() => router.back()} />
      <h1 className="sr-only md:not-sr-only md:mb-6 md:font-heading md:text-headline-4 md:font-bold">Scan receipt</h1>
      {/* One hidden input per way in: the first is the one tests and assistive tech find by name. */}
      <input ref={gallery} type="file" accept="image/jpeg,image/png,application/pdf" aria-label="Receipt file" className="sr-only" tabIndex={-1} onChange={(event) => pick(event.target.files?.[0])} />
      <input ref={photo} type="file" accept="image/jpeg,image/png" capture="environment" aria-label="Receipt photo" className="sr-only" tabIndex={-1} onChange={(event) => pick(event.target.files?.[0])} />
      <input ref={pdf} type="file" accept="application/pdf" aria-label="Receipt PDF" className="sr-only" tabIndex={-1} onChange={(event) => pick(event.target.files?.[0])} />

      {camera === "on" ? (
        // The live camera (computers): a real viewfinder, so the shutter belongs here.
        <div className="relative flex min-h-[32rem] max-w-xl flex-col justify-between overflow-hidden rounded-3xl bg-text-primary px-6 pt-8 pb-8 text-text-inverse">
          <video ref={video} muted playsInline onLoadedData={() => setFrameReady(true)} aria-label="Camera preview" className="absolute inset-0 size-full object-cover" />
          <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-text-primary/80 via-transparent to-text-primary/60" />
          <button type="button" onClick={stopCamera} className="absolute top-4 right-4 z-10 rounded-full bg-text-primary/60 px-4 py-2 text-caption font-medium text-text-inverse">
            Close camera
          </button>
          <p className="relative text-center text-caption">Fit the whole receipt in the frame</p>
          <Image src={svg("snap-corner-brackets")} alt="" width={240} height={320} unoptimized className="relative mx-auto my-6 h-auto w-3/5 max-w-60 opacity-80" />
          {alert}
          <div className="relative flex justify-center">
            <button type="button" aria-label="Capture photo" disabled={upload.isPending || !frameReady} onClick={takePhoto} className="disabled:opacity-50">
              <Image src={svg("snap-shutter")} alt="" width={72} height={72} unoptimized />
            </button>
          </div>
          {reading}
        </div>
      ) : (
        <div className="relative flex max-w-xl flex-col items-center gap-5 overflow-hidden rounded-3xl bg-surface-subtle px-6 py-10 text-center">
          <Image src="/design/3d-camera.png" alt="" width={96} height={96} className="size-24 object-contain" />
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-body-1 font-bold">Scan a receipt</h2>
            <p className="text-caption text-text-secondary">Photograph the whole receipt, or choose one you already have.</p>
          </div>
          {alert}
          <div className="flex w-full flex-col gap-3">
            <button type="button" disabled={upload.isPending || camera === "starting"} onClick={() => void openCamera()} className={`${option} bg-brand-primary text-text-inverse hover:bg-brand-primary-strong`}>
              {camera === "starting" ? "Starting the camera…" : "Open camera"}
            </button>
            <button type="button" disabled={upload.isPending} onClick={() => gallery.current?.click()} className={`${option} bg-surface-default hover:bg-border-default`}>
              Choose from gallery
            </button>
            <button type="button" disabled={upload.isPending} onClick={() => pdf.current?.click()} className={`${option} bg-surface-default hover:bg-border-default`}>
              Upload a PDF
            </button>
          </div>
          <p className="text-caption-small text-text-secondary">JPEG, PNG or PDF, up to 5 MB.</p>
          {reading}
        </div>
      )}
    </>
  );
}
