import type { ReactNode } from "react";
import { Container } from "./Container";
import { Icon3d, type IconName } from "./Icon3d";
import { reveal } from "./motion";
import { SectionTag } from "./SectionTag";

function Card({
  className = "",
  delay = 0,
  children,
}: {
  className?: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <article
      className={`group relative h-[340px] overflow-hidden rounded-[2.5rem] p-9 hover:scale-[1.015] ${className}`}
      {...reveal(delay)}
    >
      {children}
    </article>
  );
}

function Float({
  name,
  className,
}: {
  name: IconName;
  className: string;
}) {
  return (
    <Icon3d
      name={name}
      size={144}
      className={`absolute transition-[translate] duration-500 ease-out group-hover:-translate-y-2 ${className}`}
    />
  );
}

function SmallCard({
  delay,
  title,
  text,
  bg,
  a,
  b,
}: {
  delay: number;
  title: string;
  text: string;
  bg: string;
  a: IconName;
  b: IconName;
}) {
  return (
    <Card className={bg} delay={delay}>
      <h3 className="text-body-1 font-semibold">{title}</h3>
      <p className="mt-2.5 max-w-[340px] text-caption text-text-secondary">{text}</p>
      <Float name={a} className="bottom-8 left-8 w-[120px] -rotate-[8deg] md:right-44 md:left-auto xl:right-auto xl:left-8" />
      <Float name={b} className="right-12 bottom-6 w-[100px] rotate-[10deg] xl:right-14" />
    </Card>
  );
}

export function Features() {
  return (
    <section id="features" className="py-14 md:py-[72px] xl:py-24">
      <Container className="flex flex-col items-center gap-10 md:gap-12">
        <div className="flex flex-col items-center gap-4 text-center" {...reveal()}>
          <SectionTag icon="groceries">Features</SectionTag>
          <h2 className="font-heading text-headline-4 font-bold md:text-headline-3">
            Everything your wallet
            <br />
            wants to tell you
          </h2>
          <p className="max-w-[600px] text-body-2 text-text-secondary">
            Four small helpers that turn paper receipts and quick thoughts into a clear picture of your month.
          </p>
        </div>

        <div className="flex w-full flex-col gap-6">
          <div className="grid gap-6 xl:grid-cols-5">
            <Card className="h-[470px] bg-linear-to-br from-brand-primary to-brand-gradient-to text-text-inverse md:h-[340px] xl:col-span-3">
              <div className="max-w-[300px]">
                <h3 className="font-heading text-headline-4 font-bold">Snap receipt</h3>
                <p className="mt-3 text-body-2">
                  Point your camera at any receipt. Merchant, items and total are filled in, then checked by plain code, not guesswork.
                </p>
              </div>
              <Float name="camera" className="right-4 bottom-6 w-[170px] -rotate-[8deg] md:top-[120px] md:right-[70px] md:bottom-auto md:w-[190px]" />
              <Float name="receipt" className="bottom-10 left-6 w-[100px] rotate-[12deg] md:top-8 md:right-[220px] md:bottom-auto md:left-auto md:w-[110px]" />
            </Card>

            <Card delay={120} className="bg-pastel-lavender md:h-[300px] xl:col-span-2 xl:h-[340px]">
              <h3 className="font-heading text-headline-4 font-bold">Quick add</h3>
              <p className="mt-3 text-body-2 text-text-secondary">
                Type it like you’d text a friend. Amounts in words work too.
              </p>
              <p className="mt-3 inline-block rounded-2xl bg-surface-default px-[18px] py-3 text-caption font-medium">
                nasi goreng dua puluh lima ribu
              </p>
              <Float name="rice" className="right-8 bottom-6 w-[110px] rotate-[10deg] md:right-12" />
              <Float name="mic" className="bottom-8 left-8 w-[70px] -rotate-[10deg] md:left-auto md:right-48 xl:left-8" />
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <SmallCard
              delay={0}
              title="Recap & Budget"
              text="See where the month went by category and how close you are to your budget."
              bg="bg-pastel-blue"
              a="recap"
              b="budget"
            />
            <SmallCard
              delay={120}
              title="Ask Notarik"
              text="Ask anything about your spending. It answers from your own data."
              bg="bg-pastel-pink"
              a="quick-add"
              b="coffee"
            />
            <SmallCard
              delay={240}
              title="Transactions"
              text="Every expense in one tidy list, grouped by day, with receipts attached."
              bg="bg-pastel-yellow"
              a="receipt"
              b="bills"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
