import type { ReactNode } from "react";

export type NavItem = { href: string; label: string; icon: ReactNode };

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0" {...stroke}>
      {children}
    </svg>
  );
}

/** One navigation config; the shell presents it as a sidebar, a top bar or a bottom bar. */
export const navItems: NavItem[] = [
  { href: "/app", label: "Home", icon: <Svg><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /></Svg> },
  { href: "/app/transactions", label: "Transactions", icon: <Svg><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></Svg> },
  { href: "/app/recap", label: "Recap", icon: <Svg><path d="M5 20V10m7 10V4m7 16v-7" /></Svg> },
  { href: "/app/ask", label: "Ask Notarik", icon: <Svg><path d="M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" /></Svg> },
  { href: "/app/settings", label: "Settings", icon: <Svg><circle cx="12" cy="12" r="3" /><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></Svg> },
];

export function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`);
}
