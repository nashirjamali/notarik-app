import Image from "next/image";
import Link from "next/link";

/** Horizontal lockup: the mark (SVG from Figma) plus the wordmark set in DM Sans Bold. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Notarik, home"
      className={`inline-flex items-center gap-3 ${className}`}
    >
      <Image
        src="/brand/mark.svg"
        alt=""
        width={64}
        height={55}
        unoptimized
        className="h-[38px] w-auto md:h-[54px]"
      />
      <span className="font-heading text-[1.75rem] leading-none font-bold tracking-tight text-text-primary md:text-4xl">
        notarik
      </span>
    </Link>
  );
}
