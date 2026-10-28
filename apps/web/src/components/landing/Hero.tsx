import Image from "next/image";
import { Container } from "./Container";
import { Icon3d, type IconName } from "./Icon3d";
import { SectionTag } from "./SectionTag";
import { StoreBadges } from "./StoreBadges";

const perks = ["Mobile & web", "You confirm everything", "Receipts or words"];

function Floating({
  name,
  size,
  className,
}: {
  name: IconName;
  size: number;
  className: string;
}) {
  return <Icon3d name={name} size={size} className={`absolute ${className}`} />;
}

/**
 * The visual is laid out on a fixed 580x780 stage (as in Figma) and scaled down to 60% on small screens.
 */
function HeroVisual() {
  return (
    <div className="relative mx-auto h-[468px] w-[348px] shrink-0 md:h-[780px] md:w-[580px]">
      <div className="absolute top-0 left-0 h-[780px] w-[580px] origin-top-left scale-[0.6] md:scale-100">
        <div
          aria-hidden="true"
          className="absolute top-[120px] left-5 h-[540px] w-[540px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-brand-primary)_45%,transparent),transparent)]"
        />
        <div className="absolute top-[50px] left-[134px] h-[675px] w-[312px] overflow-hidden rounded-[44px] border-8 border-text-primary bg-surface-default">
          <Image
            src="/screens/home.png"
            alt="The Notarik app home screen with Snap receipt, Ask Notarik and quick links"
            fill
            sizes="312px"
            priority
            className="object-cover object-top"
          />
        </div>

        <Floating name="recap" size={104} className="top-[300px] left-[466px] w-[104px] -rotate-[10deg]" />
        <Floating name="budget" size={124} className="top-[470px] -left-1 w-[124px] rotate-[10deg]" />
        <Floating name="camera" size={92} className="top-[600px] left-[450px] w-[92px] rotate-[8deg]" />
        <Floating name="groceries" size={72} className="top-[690px] left-20 w-[72px] -rotate-[8deg]" />

        <div className="absolute top-[90px] left-[372px] flex w-max md:left-[396px] -rotate-[5deg] items-center gap-2.5 rounded-full bg-brand-primary py-2.5 pr-[18px] pl-2.5 text-text-inverse">
          <Icon3d name="receipt" size={32} className="w-8" />
          <span className="text-caption font-medium whitespace-nowrap">Receipt read in seconds</span>
        </div>
        <div className="absolute top-[700px] left-[250px] flex w-max -rotate-[4deg] items-center gap-3 rounded-3xl bg-surface-default p-3 pr-5">
          <span className="flex size-[52px] items-center justify-center rounded-2xl bg-surface-subtle">
            <Icon3d name="coffee" size={40} className="w-10" />
          </span>
          <span className="flex flex-col">
            <span className="text-caption font-medium text-text-primary">Kopi · Rp 25.000</span>
            <span className="text-caption-small text-text-secondary">Logged from “kopi 25rb”</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="overflow-x-clip bg-linear-to-b from-surface-default to-brand-accent-subtle">
      <Container className="flex flex-col items-center gap-8 pt-2 pb-12 md:gap-12 md:pb-16 lg:flex-row lg:gap-8 lg:pb-20">
        <div className="flex w-full flex-col items-start gap-5 md:gap-7 lg:flex-1">
          <SectionTag icon="quick-add" className="border border-border-default bg-surface-default">
            Your friendly receipt buddy
          </SectionTag>
          <h1 className="font-heading text-headline-3 font-bold md:text-headline-1">
            Snap it.
            <br />
            <span className="text-brand-primary">We&apos;ll sort it.</span>
          </h1>
          <p className="text-body-2 text-text-secondary md:text-body-1">
            Photograph a receipt or just type what you bought. Notarik fills in the details, sorts the category and keeps your month on track.
          </p>
          <StoreBadges />
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-1.5 text-caption text-text-secondary">
                <span aria-hidden="true" className="size-2 rounded-full bg-brand-primary" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <HeroVisual />
      </Container>
    </section>
  );
}
