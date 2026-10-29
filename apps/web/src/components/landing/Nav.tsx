import Link from "next/link";
import { Container } from "./Container";
import { Logo } from "./Logo";

const links = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#ask", label: "Ask Notarik" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  return (
    <header>
      <Container className="flex items-center justify-between py-5 md:py-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-10 lg:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-caption font-medium text-text-secondary hover:text-text-primary">
              {l.label}
            </a>
          ))}
        </nav>
        <Link
          href="/app"
          prefetch={false}
          className="rounded-full bg-brand-primary px-4 py-3 font-heading text-button-2 font-bold text-text-inverse transition-[translate,scale,background-color] hover:-translate-y-0.5 hover:bg-brand-primary-strong active:scale-95 md:px-6 md:py-3.5"
        >
          Open web app
        </Link>
      </Container>
    </header>
  );
}
