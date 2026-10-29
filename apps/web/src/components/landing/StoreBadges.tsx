import Image from "next/image";
import Link from "next/link";

function ComingSoon() {
  return (
    <span className="absolute -top-[20px] right-1.5 rounded-full bg-brand-primary px-2 py-0.5 text-caption-small font-semibold text-text-inverse">
      Coming soon
    </span>
  );
}

const webTones = {
  default: "bg-brand-primary text-text-inverse hover:bg-brand-primary-strong",
  inverse: "bg-surface-default text-brand-primary hover:bg-surface-subtle",
} as const;

/**
 * The web app is available (links to /app) and stands on its own as a plain primary button. The native apps are not out yet:
 * they sit in a separate, smaller row as non-interactive badges with a "Coming soon" tag.
 * The App Store and Google Play badges are the official artwork (public/badges). Before launch, link them to the
 * real store pages and drop the "Coming soon" tag, as Apple and Google require the badges to link to the listing.
 */
export function StoreBadges({ className = "", tone = "default" }: { className?: string; tone?: keyof typeof webTones }) {
  return (
    <div className={`flex flex-col gap-5 pt-2 ${className}`}>
      <Link
        href="/app"
        prefetch={false}
        className={`flex h-13 w-fit items-center justify-center rounded-full px-8 font-heading text-button-1 font-bold transition-[translate,scale,background-color] hover:-translate-y-0.5 active:scale-95 ${webTones[tone]}`}
      >
        Open app
      </Link>
      <ul className="flex flex-wrap gap-x-3 gap-y-6 pt-4">
        <li className="relative">
          <Image
            src="/badges/app-store.svg"
            alt="Download on the App Store (coming soon)"
            width={120}
            height={40}
            unoptimized
            className="h-10 w-auto"
          />
          <ComingSoon />
        </li>
        <li className="relative">
          <Image
            src="/badges/google-play.png"
            alt="Get it on Google Play (coming soon)"
            width={646}
            height={250}
            className="-mx-[10px] -my-[6px] h-[53px] w-auto max-w-none shrink-0"
          />
          <ComingSoon />
        </li>
      </ul>
    </div>
  );
}
