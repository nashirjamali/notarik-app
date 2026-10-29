"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, getSettings, updateSettings } from "@/lib/client";
import type { Settings } from "@/lib/types";
import { Card, ErrorState, PageTitle, Skeleton } from "./ui";

const toggles: { key: keyof Settings; label: string; hint: string }[] = [
  { key: "auto_read_receipts", label: "Read receipts automatically", hint: "Fill in a receipt as soon as it is uploaded. You still confirm it before it is saved." },
  { key: "notifications", label: "Notifications", hint: "Reminders and budget alerts." },
];

function Switch({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <li className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-0.5">
        <span id={`${id}-label`} className="text-body-2 font-medium">
          {label}
        </span>
        <span className="text-caption text-text-secondary">{hint}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? "bg-brand-primary" : "bg-border-default"}`}
      >
        <span className={`absolute top-1 left-1 size-6 rounded-full bg-surface-default transition-transform ${checked ? "translate-x-6" : ""}`} />
      </button>
    </li>
  );
}

export function SettingsView() {
  const client = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const settings = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const save = useMutation({
    mutationFn: updateSettings,
    // Flip the switch at once; the server answer (or a rollback on failure) settles it.
    onMutate: async (patch) => {
      await client.cancelQueries({ queryKey: ["settings"] });
      const before = client.getQueryData<Settings>(["settings"]);
      if (before) client.setQueryData<Settings>(["settings"], { ...before, ...patch });
      return { before };
    },
    onError: (_error, _patch, context) => {
      if (context?.before) client.setQueryData(["settings"], context.before);
    },
    onSuccess: (next) => client.setQueryData(["settings"], next),
  });

  return (
    <>
      <PageTitle>Settings</PageTitle>
      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="mb-3 font-heading text-body-1 font-bold">Account</h2>
          {me.isPending ? (
            <Skeleton className="h-12 w-64" />
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-2">
              <dt className="text-text-secondary">Name</dt>
              <dd>{me.data?.name ?? "Not set"}</dd>
              <dt className="text-text-secondary">Email</dt>
              <dd className="break-all">{me.data?.email ?? "Not set"}</dd>
            </dl>
          )}
        </Card>

        {settings.isError ? (
          <ErrorState message="Could not load your settings." onRetry={() => settings.refetch()} />
        ) : (
          <Card>
            <h2 className="mb-4 font-heading text-body-1 font-bold">Preferences</h2>
            {settings.isPending ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <ul className="divide-y divide-border-default">
                {toggles.map(({ key, label, hint }) => (
                  <Switch
                    key={key}
                    id={key}
                    label={label}
                    hint={hint}
                    checked={settings.data[key]}
                    onChange={(next) => save.mutate({ [key]: next })}
                  />
                ))}
              </ul>
            )}
            {save.isError && (
              <p role="alert" className="mt-4 text-caption text-status-danger">
                {save.error.message}. Your change was not saved.
              </p>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
