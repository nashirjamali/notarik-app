"use client";

import { Card } from "@/components/app/ui";

/** Catches rendering errors inside the signed-in app, so the shell and navigation stay usable. */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="flex flex-col items-start gap-3">
      <h1 className="font-heading text-body-1 font-bold">Something went wrong</h1>
      <p className="text-caption text-text-secondary">This page could not be shown. Your data is safe.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-brand-primary px-5 py-2.5 text-button-2 font-bold text-text-inverse hover:bg-brand-primary-strong"
      >
        Try again
      </button>
    </Card>
  );
}
