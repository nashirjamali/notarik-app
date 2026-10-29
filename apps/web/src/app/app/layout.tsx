import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Providers } from "@/components/app/Providers";

export const metadata: Metadata = {
  title: { default: "Notarik app", template: "%s · Notarik" },
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      {/* Route-dependent hooks (usePathname, useParams) resolve at request time on dynamic routes like /app/transactions/[id]. */}
      <Suspense fallback={<div className="min-h-dvh bg-surface-subtle" />}>
        <AppShell>{children}</AppShell>
      </Suspense>
    </Providers>
  );
}
