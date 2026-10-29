import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Providers } from "@/components/app/Providers";

export const metadata: Metadata = {
  title: { default: "Notarik app", template: "%s · Notarik" },
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <AppShell>{children}</AppShell>
    </Providers>
  );
}
