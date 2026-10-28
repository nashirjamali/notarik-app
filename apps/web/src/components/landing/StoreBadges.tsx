import Link from "next/link";

const APPLE_PATH =
  "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701";

function AppleGlyph() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0 fill-text-inverse">
      <path d={APPLE_PATH} />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M4 2.2 14 12 4 21.8c-.3-.2-.5-.6-.5-1V3.2c0-.4.2-.8.5-1z" fill="#00A0FF" />
      <path d="M17.3 8.7 14 12l3.3 3.3 3.9-2.2c1-.6 1-1.9 0-2.5z" fill="#FFD000" />
      <path d="M4 2.2c.3-.2.8-.2 1.3.1L17.3 8.7 14 12z" fill="#00E676" />
      <path d="M4 21.8 14 12l3.3 3.3L5.3 21.9c-.5.3-1 .3-1.3-.1z" fill="#FF3A44" />
    </svg>
  );
}

function GlobeGlyph() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 stroke-brand-primary-strong"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

const base = "relative flex items-center gap-2.5 rounded-2xl px-4 py-3";

/**
 * The web app is available (links to /app). The native apps are not out yet:
 * they are shown as non-interactive badges with a "Coming soon" tag.
 * Replace the hand-drawn App Store / Google Play glyphs with the official badge artwork before launch.
 */
export function StoreBadges({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-x-3 gap-y-5 pt-2.5 ${className}`}>
      <li>
        <Link
          href="/app"
          prefetch={false}
          className={`${base} border border-border-default bg-surface-default transition-colors hover:bg-brand-accent-subtle`}
        >
          <GlobeGlyph />
          <span className="flex flex-col text-left">
            <span className="text-caption-small text-text-secondary">Available now on the</span>
            <span className="font-medium text-body-2 text-brand-primary-strong">Web app</span>
          </span>
        </Link>
      </li>
      <li>
        <div className={`${base} bg-surface-inverse text-text-inverse`}>
          <AppleGlyph />
          <span className="flex flex-col text-left">
            <span className="text-caption-small">Available on the</span>
            <span className="font-medium text-body-2">App Store</span>
          </span>
          <span className="absolute -top-2.5 right-[-0.5rem] rounded-full bg-brand-primary px-2.5 py-0.5 text-caption-small font-semibold text-text-inverse">
            Coming soon
          </span>
        </div>
      </li>
      <li>
        <div className={`${base} bg-surface-inverse text-text-inverse`}>
          <PlayGlyph />
          <span className="flex flex-col text-left">
            <span className="text-caption-small">Available on the</span>
            <span className="font-medium text-body-2">Google Play</span>
          </span>
          <span className="absolute -top-2.5 right-[-0.5rem] rounded-full bg-brand-primary px-2.5 py-0.5 text-caption-small font-semibold text-text-inverse">
            Coming soon
          </span>
        </div>
      </li>
    </ul>
  );
}
