import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-surface-subtle px-5 py-10">
      <Link href="/" aria-label="Notarik, home" className="inline-flex items-center gap-3">
        <Image src="/brand/mark.svg" alt="" width={64} height={55} unoptimized className="h-10 w-auto" />
        <span className="font-heading text-3xl leading-none font-bold tracking-tight">notarik</span>
      </Link>
      {children}
    </main>
  );
}
