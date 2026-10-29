"use client";

import { useEffect, useRef } from "react";

export type Option<T extends string> = { value: T; label: string; dot?: string };

/**
 * Pick one option from a list. A bottom sheet in the mobile layout, a centered dialog from 768px.
 * Built on <dialog>, so focus is trapped and Escape closes it without extra code.
 */
export function OptionSheet<T extends string>({
  open,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  open: boolean;
  title: string;
  options: Option<T>[];
  selected?: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
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
      className="m-0 mt-auto w-full max-w-none rounded-t-[32px] bg-surface-default p-0 text-text-primary backdrop:bg-text-primary/50 md:m-auto md:w-96 md:rounded-3xl"
    >
      <div className="flex flex-col gap-1 px-6 pt-2 pb-8">
        <div aria-hidden="true" className="mx-auto mb-3 h-1 w-9 rounded-full bg-border-default md:hidden" />
        <h2 className="text-body-2 font-medium">{title}</h2>
        <div role="radiogroup" aria-label={title} className="flex flex-col gap-1">
          {options.map((option) => {
            const active = option.value === selected;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onSelect(option.value)}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-3 text-left text-caption ${active ? "bg-surface-subtle font-medium" : ""}`}
              >
                {option.dot && <span aria-hidden="true" className={`size-2 rounded-full ${option.dot}`} />}
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </dialog>
  );
}
