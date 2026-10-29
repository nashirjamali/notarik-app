"use client";

import { useEffect, useRef } from "react";

/** A small sheet with a few lines of read-only text: a bottom sheet under 768px, a centered dialog above. */
export function InfoSheet({ open, title, lines, onClose }: { open: boolean; title: string; lines: string[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      aria-label={title}
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && onClose()}
      className="m-0 mt-auto w-full max-w-none rounded-t-[32px] bg-surface-default p-0 text-text-primary backdrop:bg-text-primary/50 md:m-auto md:w-[28rem] md:rounded-3xl"
    >
      <div className="flex flex-col gap-3 p-6 pb-10">
        <div aria-hidden="true" className="mx-auto h-1 w-9 rounded-full bg-border-default md:hidden" />
        <h2 className="text-body-2 font-medium">{title}</h2>
        {lines.map((line) => (
          <p key={line} className="text-caption text-text-secondary">
            {line}
          </p>
        ))}
        <button type="button" onClick={onClose} className="mt-2 h-11 rounded-xl bg-surface-subtle font-heading text-button-2 font-bold">
          Close
        </button>
      </div>
    </dialog>
  );
}
