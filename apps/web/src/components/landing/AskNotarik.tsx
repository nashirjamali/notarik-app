import Image from "next/image";
import { Icon3d } from "./Icon3d";
import { reveal } from "./motion";

function Mark({ className }: { className: string }) {
  return <Image src="/brand/mark.svg" alt="" width={64} height={55} unoptimized className={className} />;
}

/** Illustrative conversation. The text summary below is what assistive tech reads. */
function ChatMock() {
  return (
    <div
      aria-hidden="true"
      className="relative flex w-full flex-col gap-3.5 rounded-[2.25rem] bg-surface-default p-[18px] md:p-7 xl:w-[500px] xl:shrink-0"
    >
      <div className="flex justify-end" {...reveal(200)}>
        <span className="rounded-[22px] bg-brand-primary px-[18px] py-3 text-body-2 text-text-inverse">
          kopi 25rb tadi pagi
        </span>
      </div>
      <div className="flex gap-2.5" {...reveal(700)}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-accent-subtle">
          <Mark className="h-auto w-[18px]" />
        </span>
        <span className="flex-1 rounded-[22px] bg-surface-subtle px-[18px] py-3 text-body-2">
          Got it. Here’s what I’ll log:
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 rounded-3xl border border-border-default p-3 pr-5" {...reveal(1200)}>
        <span className="flex size-[44px] items-center justify-center rounded-2xl bg-surface-subtle md:size-14">
          <Icon3d name="coffee" size={44} className="w-[34px] md:w-11" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-2 font-medium">Kopi</span>
          <span className="text-caption-small text-text-secondary">Food &amp; Drink · Today, 07:30</span>
        </span>
        <span className="ml-auto text-body-2 font-semibold md:text-body-1">Rp 25.000</span>
      </div>
      <div className="flex gap-2.5" {...reveal(1700)}>
        <span className="flex-1 rounded-full bg-surface-subtle py-3 text-center font-heading text-button-2 font-bold">
          Edit
        </span>
        <span className="flex-1 rounded-full bg-brand-primary py-3 text-center font-heading text-button-2 font-bold text-text-inverse">
          Save
        </span>
      </div>
    </div>
  );
}

export function AskNotarik() {
  return (
    <section id="ask" className="py-14 md:py-[72px] xl:py-24">
      <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8 xl:px-20">
        <div className="relative flex flex-col gap-9 overflow-hidden rounded-[2.5rem] bg-surface-inverse p-6 md:rounded-[3.5rem] md:p-10 xl:flex-row xl:items-center xl:gap-14 xl:p-[72px]">
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-16 size-[320px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-brand-primary)_55%,transparent),transparent)] md:size-[480px] xl:top-[-120px] xl:right-[-100px] xl:size-[560px]"
          />
          <div className="relative flex flex-1 flex-col gap-5 text-text-inverse" {...reveal()}>
            <Mark className="h-auto w-[83px]" />
            <h2 className="font-heading text-headline-4 font-bold md:text-headline-3">Meet Ask Notarik</h2>
            <p className="text-body-2 xl:text-body-1">
              “Am I on track this month?” “Log nasi goreng 25 ribu.” A chat assistant that answers from your own data and never writes anything without your confirmation.
            </p>
          </div>
          <div className="relative">
            <ChatMock />
            <p className="sr-only">
              Example: you type “kopi 25rb tadi pagi”. Notarik proposes logging Kopi, Food and Drink, Rp 25.000, and waits for you to press Save.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
