"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { signOut } from "@/lib/client";
import { isActive, navItems, svg } from "./nav";

function Brand() {
  return (
    <Link href="/app" aria-label="Notarik, home" className="inline-flex items-center gap-2.5">
      <Image src="/brand/mark.svg" alt="" width={64} height={55} unoptimized className="h-8 w-auto" />
      <span className="font-heading text-2xl leading-none font-bold tracking-tight">notarik</span>
    </Link>
  );
}

export function useSignOut() {
  const router = useRouter();
  const client = useQueryClient();
  return async () => {
    await signOut();
    // Drop cached rows so the next user on this browser never sees them.
    client.clear();
    router.replace("/login");
  };
}

function Icon({ name, size, className = "" }: { name: string; size: number; className?: string }) {
  return <Image src={svg(name)} alt="" width={size} height={size} unoptimized className={`shrink-0 ${className}`} style={{ width: size, height: size }} />;
}

/**
 * Under 768px this is the mobile app: a floating dark pill with the raised "+" (Figma "Bottom Nav").
 * From 768px it is a sidebar with the same five entries in the same order.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const signOut = useSignOut();
  return (
    <div className="min-h-dvh bg-surface-default md:bg-surface-subtle md:pl-60">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col gap-8 border-r border-border-default bg-surface-default p-6 md:flex">
        <Brand />
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const active = isActive(pathname, item);
            if (item.add) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="my-2 flex items-center justify-center gap-2 rounded-full bg-brand-primary px-4 py-3 font-heading text-button-1 font-bold text-text-inverse transition-colors hover:bg-brand-primary-strong"
                >
                  <span aria-hidden="true" className="text-xl leading-none">
                    +
                  </span>
                  {item.label}
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-body-2 font-medium transition-colors ${
                  active ? "bg-brand-accent-subtle text-brand-primary-strong" : "text-text-secondary hover:bg-surface-subtle"
                }`}
              >
                {/* The inactive artwork is light-on-dark for the pill; on the white sidebar the dark "active" strokes are dimmed instead. */}
                <Icon name={item.active} size={22} className={active ? "" : "opacity-60"} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={signOut}
          className="self-start rounded-full px-4 py-2 text-button-2 font-bold text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
        >
          Log out
        </button>
      </aside>

      <main className="mx-auto w-full max-w-5xl px-6 pt-4 pb-40 md:px-8 md:pt-8 md:pb-12 lg:px-12 lg:pt-10">{children}</main>

      <nav
        aria-label="Main"
        className="fixed inset-x-6 bottom-[calc(34px+env(safe-area-inset-bottom))] z-20 flex h-16 items-center justify-around rounded-full bg-text-primary px-2 shadow-[0_4px_8px_rgb(0_0_0/0.3)] md:hidden"
      >
        {navItems.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-center rounded-full ${item.add ? "size-14" : `size-12 ${active ? "bg-surface-default" : ""}`}`}
            >
              <Icon name={active ? item.active : item.inactive} size={item.add ? 56 : 24} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
