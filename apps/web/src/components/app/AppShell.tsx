"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { signOut } from "@/lib/client";
import { isActive, navItems } from "./nav";

function Brand() {
  return (
    <Link href="/app" aria-label="Notarik, home" className="inline-flex items-center gap-2.5">
      <Image src="/brand/mark.svg" alt="" width={64} height={55} unoptimized className="h-8 w-auto" />
      <span className="font-heading text-2xl leading-none font-bold tracking-tight">notarik</span>
    </Link>
  );
}

function SignOut({ className = "" }: { className?: string }) {
  const router = useRouter();
  const client = useQueryClient();
  return (
    <button
      type="button"
      onClick={async () => {
        await signOut();
        // Drop cached rows so the next user on this browser never sees them.
        client.clear();
        router.replace("/login");
      }}
      className={`rounded-full px-4 py-2 text-button-2 font-bold text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary ${className}`}
    >
      Log out
    </button>
  );
}

/** Sidebar from 1024px, top bar at 768px, bottom bar below that. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh bg-surface-subtle lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col gap-8 border-r border-border-default bg-surface-default p-6 lg:flex">
        <Brand />
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-body-2 font-medium transition-colors ${
                  active ? "bg-brand-accent-subtle text-brand-primary-strong" : "text-text-secondary hover:bg-surface-subtle"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <SignOut className="self-start" />
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border-default bg-surface-default px-5 py-3 md:px-8 lg:hidden">
        <Brand />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-button-2 font-bold transition-colors ${
                  active ? "bg-brand-accent-subtle text-brand-primary-strong" : "text-text-secondary hover:bg-surface-subtle"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <SignOut />
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 pt-6 pb-28 md:px-8 md:pb-12 lg:px-12 lg:pt-10">{children}</main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border-default bg-surface-default pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-caption-small font-medium ${
                active ? "text-brand-primary-strong" : "text-text-secondary"
              }`}
            >
              {item.icon}
              {item.label === "Ask Notarik" ? "Ask" : item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
