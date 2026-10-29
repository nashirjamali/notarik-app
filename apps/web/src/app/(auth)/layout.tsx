import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/** Under 768px the form is the whole mobile screen (white, top-aligned). From 768px it is a card on grey, under the logo. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-surface-default px-6 pt-6 pb-10 md:justify-center md:gap-8 md:bg-surface-subtle md:py-10">
      <Link href="/" aria-label="Notarik, home" className="hidden items-center gap-3 md:inline-flex">
        <Image src="/brand/mark.svg" alt="" width={64} height={55} unoptimized className="h-10 w-auto" />
        <span className="font-heading text-3xl leading-none font-bold tracking-tight">notarik</span>
      </Link>
      {children}
    </main>
  );
}
