"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { downloadCsv, getMe, getSettings, updateSettings } from "@/lib/client";
import { categoryOrder, type Settings } from "@/lib/types";
import pkg from "../../../package.json";
import { useSignOut } from "./AppShell";
import { InfoSheet } from "./InfoSheet";
import { Skeleton, categoryMeta } from "./ui";

type Sheet = "categories" | "help" | "privacy" | null;

const HELP = [
  "Tap + to type a sentence like “kopi 25rb” or to scan a receipt.",
  "Ask Notarik in the Chat tab about your spending. It proposes changes and you confirm each one.",
  "Open Recap from Home to set a monthly budget and limits per category.",
];
const PRIVACY = [
  "Your expenses are stored in your own account and are only readable by you.",
  "Receipt photos are read by an AI model to fill in the details. Text on a receipt is never treated as an instruction.",
  "Notarik never saves anything by itself. Every change waits for your confirmation.",
];

const icon = (name: string) => <Image src={`/app-assets/svg/${name}.svg`} alt="" width={20} height={20} unoptimized />;

function Switch({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange?: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-60 ${checked ? "bg-brand-primary" : "bg-border-default"}`}
    >
      <span className={`absolute top-1 left-1 size-6 rounded-full bg-surface-default transition-transform ${checked ? "translate-x-6" : ""}`} />
    </button>
  );
}

/** One row of a group: a 32px icon tile, a title, and a value, a switch or a chevron. */
function Row({ iconName, title, subtitle, value, onClick, href, right, tinted, last }: { iconName: string; title: string; subtitle?: string; value?: string; onClick?: () => void; href?: string; right?: ReactNode; tinted?: boolean; last?: boolean }) {
  const body = (
    <>
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-[10px] ${tinted ? "bg-brand-accent-subtle" : "bg-surface-default"}`}>{icon(iconName)}</span>
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="text-caption font-medium">{title}</span>
        {subtitle && <span className="text-caption-small text-text-secondary">{subtitle}</span>}
      </span>
      {value && <span className="text-caption text-text-secondary">{value}</span>}
      {right ?? (onClick || href ? icon("settings-chevron-right") : null)}
    </>
  );
  const style = `flex w-full items-center gap-3 ${tinted ? "py-2.5" : "py-2"} ${last ? "" : "border-b border-border-default"}`;
  if (href) return <Link href={href} className={style}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={style}>{body}</button>;
  return <div className={style}>{body}</div>;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-caption-small font-semibold text-text-secondary">{title}</h2>
      <div className="rounded-[20px] bg-surface-subtle px-3 py-1">{children}</div>
    </section>
  );
}

export function SettingsView() {
  const client = useQueryClient();
  const signOut = useSignOut();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const settings = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const [sheet, setSheet] = useState<Sheet>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
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

  const name = me.data?.name?.trim() || me.data?.email?.split("@")[0] || "Notarik";
  async function exportData() {
    setExporting(true);
    setExportError(null);
    try {
      await downloadCsv();
    } catch {
      setExportError("Could not export your data");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <h1 className="flex h-14 items-center text-body-1 font-semibold md:h-auto md:font-heading md:text-headline-4 md:font-bold">Settings</h1>

      <section aria-label="Account" className="flex items-center gap-3 rounded-[20px] bg-surface-subtle p-3">
        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-accent-subtle text-body-1 font-semibold text-brand-primary-strong">
          {me.data ? name.charAt(0).toUpperCase() : ""}
        </span>
        <div className="flex min-w-0 flex-col">
          {me.isPending ? <Skeleton className="h-5 w-40" /> : <span className="truncate text-body-2 font-medium">{name}</span>}
          {me.data?.email && <span className="truncate text-caption-small text-text-secondary">{me.data.email}</span>}
        </div>
      </section>

      {settings.isError ? (
        <p role="alert" className="text-caption text-status-danger-text">Could not load your settings.</p>
      ) : (
        <>
          <Group title="Notarik AI">
            <Row tinted iconName="settings-receipt" title="Auto-read receipts" subtitle="Notarik fills in details from photos" right={<Switch label="Auto-read receipts" checked={settings.data?.auto_read_receipts ?? true} onChange={(next) => save.mutate({ auto_read_receipts: next })} />} />
            <Row tinted last iconName="settings-check" title="Confirm before saving" subtitle="AI proposes, you commit" right={<Switch label="Confirm before saving" checked disabled />} />
          </Group>

          <Group title="Preferences">
            <Row iconName="settings-coin" title="Currency" value="IDR (Rp)" />
            <Row iconName="settings-globe" title="Language" value="English" />
            <Row last iconName="settings-bell" title="Notifications" right={<Switch label="Notifications" checked={settings.data?.notifications ?? true} onChange={(next) => save.mutate({ notifications: next })} />} />
          </Group>
          {save.isError && (
            <p role="alert" className="text-caption-small text-status-danger-text">
              {save.error.message}. Your change was not saved.
            </p>
          )}
        </>
      )}

      <Group title="Money">
        <Row iconName="settings-tag" title="Categories" onClick={() => setSheet("categories")} />
        <Row iconName="settings-target" title="Budgets" href="/app/recap" />
        <Row last iconName="settings-download" title={exporting ? "Exporting…" : "Export data"} onClick={exporting ? undefined : () => void exportData()} />
      </Group>
      {exportError && (
        <p role="alert" className="text-caption-small text-status-danger-text">
          {exportError}
        </p>
      )}

      <Group title="About">
        <Row iconName="settings-help" title="Help" onClick={() => setSheet("help")} />
        <Row iconName="settings-lock" title="Privacy" onClick={() => setSheet("privacy")} />
        <Row last iconName="settings-info" title="Version" value={pkg.version} />
      </Group>

      {/* The wide sidebar follows the Figma frame, which has no Log out, so it lives here at every width. */}
      <button type="button" onClick={signOut} className="py-2 font-heading text-button-2 font-bold text-status-danger-text">
        Log out
      </button>

      <InfoSheet open={sheet === "categories"} title="Categories" lines={[categoryOrder.map((value) => categoryMeta[value].label).join(", "), "Notarik sorts each expense into one of these."]} onClose={() => setSheet(null)} />
      <InfoSheet open={sheet === "help"} title="Help" lines={HELP} onClose={() => setSheet(null)} />
      <InfoSheet open={sheet === "privacy"} title="Privacy" lines={PRIVACY} onClose={() => setSheet(null)} />
    </div>
  );
}
