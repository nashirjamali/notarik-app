"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Suspense, type ReactNode } from "react";
import { signOut } from "@/lib/client";
import { addExpenseHref, isActive, isSidebarActive, navItems, sidebarItems, svg } from "./nav";

function Brand() {
  return (
    <Link href="/app" aria-label="Notarik, home" className="inline-flex items-center gap-[11px]">
      <Image src="/design/mark.svg" alt="" width={45} height={38} unoptimized className="h-[38px] w-[45px]" />
      <span className="font-heading text-[30.8px] leading-none font-bold tracking-[-1.232px]">notarik</span>
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

/** A design asset drawn in the current text colour (the Figma icons are fixed-colour SVGs, so they act as a mask). */
function MaskIcon({ name, size }: { name: string; size: number }) {
  const url = `url(/design/${name}.svg)`;
  return <span aria-hidden="true" className="shrink-0 bg-current" style={{ width: size, height: size, maskImage: url, WebkitMaskImage: url, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" }} />;
}

/** Pathname-dependent parts live in their own components so the rest of the shell renders with the first HTML. */
function SidebarLinks() {
  const pathname = usePathname();
  return (
    <>
      {sidebarItems.map((item) => {
        const active = isSidebarActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-caption transition-colors ${
              active ? "bg-brand-accent-subtle font-medium text-brand-primary-strong" : "text-text-secondary hover:bg-surface-subtle"
            }`}
          >
            <MaskIcon name={item.icon} size={20} />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function AddExpense() {
  const pathname = usePathname();
  return (
    <Link
      href={addExpenseHref}
      aria-current={pathname === addExpenseHref ? "page" : undefined}
      className="flex items-center justify-center gap-2 rounded-full bg-brand-primary py-3.5 font-heading text-button-2 font-bold text-text-inverse transition-colors hover:bg-brand-primary-strong"
    >
      <MaskIcon name="icon-plus" size={18} />
      Add expense
    </Link>
  );
}

function PillLinks() {
  const pathname = usePathname();
  return (
    <>
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
    </>
  );
}

/** The pill's links without an active state, shown until the pathname is known. */
function PlainPillLinks() {
  return (
    <>
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} aria-label={item.label} className={`flex items-center justify-center rounded-full ${item.add ? "size-14" : "size-12"}`}>
          <Icon name={item.inactive} size={item.add ? 56 : 24} />
        </Link>
      ))}
    </>
  );
}

/** The sidebar's links without an active state, shown until the pathname is known. */
function PlainSidebarLinks() {
  return (
    <>
      {sidebarItems.map((item) => (
        <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-caption text-text-secondary">
          <MaskIcon name={item.icon} size={20} />
          {item.label}
        </Link>
      ))}
    </>
  );
}

/**
 * Under 768px this is the mobile app: a floating dark pill with the raised "+" (Figma "Bottom Nav").
 * From 768px it is a sidebar with the same five entries in the same order.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface-default md:pl-[260px]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[260px] flex-col gap-8 border-r border-border-default bg-surface-default px-5 py-7 md:flex">
        <Brand />
        <nav aria-label="Main" className="flex flex-col gap-1.5">
          <Suspense fallback={<PlainSidebarLinks />}>
            <SidebarLinks />
          </Suspense>
        </nav>
        <div className="mt-auto">
          <Suspense fallback={null}>
            <AddExpense />
          </Suspense>
        </div>
      </aside>

      <main className="w-full max-w-[1180px] px-6 pt-4 pb-40 md:px-8 md:pt-10 md:pb-12 lg:px-12">{children}</main>

      <nav
        aria-label="Main"
        className="fixed inset-x-6 bottom-[calc(34px+env(safe-area-inset-bottom))] z-20 flex h-16 items-center justify-around rounded-full bg-text-primary px-2 shadow-[0_4px_8px_rgb(0_0_0/0.3)] md:hidden"
      >
        <Suspense fallback={<PlainPillLinks />}>
          <PillLinks />
        </Suspense>
      </nav>
    </div>
  );
}
