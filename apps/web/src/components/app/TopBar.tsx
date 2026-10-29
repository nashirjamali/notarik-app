import Image from "next/image";
import type { ReactNode } from "react";

/** The mobile "Top Bar": a round back button, a centered title and a 48px slot on the right. Mobile layout only. */
export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="-mt-4 mb-2 grid h-24 grid-cols-[3rem_1fr_3rem] items-center md:hidden">
      {onBack ? (
        <button type="button" aria-label="Back" onClick={onBack} className="flex size-12 items-center justify-center rounded-full bg-border-default">
          <Image src="/app-assets/svg/login-chevron-left.svg" alt="" width={24} height={24} unoptimized />
        </button>
      ) : (
        <span />
      )}
      <p className="text-center text-body-2 font-medium">{title}</p>
      <div className="relative flex justify-end">{right}</div>
    </div>
  );
}

/** The round 48px button used on the right of a TopBar. */
export function TopBarButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex size-12 items-center justify-center rounded-full bg-border-default">
      {children}
    </button>
  );
}
