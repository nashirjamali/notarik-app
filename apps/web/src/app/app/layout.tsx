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
      <AppShell>
        {/* Route-dependent hooks (useParams, useSearchParams) resolve at request time on dynamic routes like /app/transactions/[id];
            only the page waits, the shell and the navigation are in the first HTML. */}
        <Suspense fallback={<div className="min-h-dvh" />}>{children}</Suspense>
      </AppShell>
    </Providers>
  );
}
