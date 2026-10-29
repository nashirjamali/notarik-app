import { Container } from "./Container";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border-default">
      <Container className="flex flex-col gap-4 py-8 lg:flex-row lg:items-center lg:justify-between lg:py-10">
        <Logo />
        <div className="flex flex-col gap-1 text-caption text-text-secondary lg:items-end">
          <p>© 2026 Notarik</p>
          <p>
            Made by Nashir Jamali ·{" "}
            <a
              href="https://nashir.tech"
              rel="noopener"
              className="font-medium text-brand-primary-strong underline underline-offset-2 hover:no-underline"
            >
              nashir.tech
            </a>
          </p>
        </div>
      </Container>
    </footer>
  );
}
