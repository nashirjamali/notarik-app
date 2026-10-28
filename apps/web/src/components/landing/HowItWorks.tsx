import { Container } from "./Container";
import { Icon3d, type IconName } from "./Icon3d";
import { reveal } from "./motion";
import { SectionTag } from "./SectionTag";

const steps: { n: number; title: string; text: string; icon: IconName }[] = [
  { n: 1, title: "Snap or type", text: "Take a photo of the receipt, or write the expense in a sentence.", icon: "camera" },
  { n: 2, title: "Review", text: "Notarik reads it and shows you the result. Totals are verified by code.", icon: "receipt" },
  { n: 3, title: "Confirm", text: "Nothing is saved until you say so. Then it lands in your recap.", icon: "budget" },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-surface-subtle py-14 md:py-[72px] lg:py-24">
      <Container className="flex flex-col items-center gap-10 md:gap-14">
        <div className="flex flex-col items-center gap-4 text-center" {...reveal()}>
          <SectionTag icon="quick-add">How it works</SectionTag>
          <h2 className="font-heading text-headline-4 font-bold md:text-headline-3">
            Three steps. No spreadsheets.
          </h2>
        </div>
        <ol className="grid w-full gap-5 lg:grid-cols-3 lg:gap-6">
          {steps.map((s, n) => (
            <li
              key={s.n}
              className="group flex flex-col items-center gap-3.5 rounded-[2.25rem] bg-surface-default px-8 pt-8 pb-9 text-center hover:scale-[1.02]"
              {...reveal(n * 140)}
            >
              <span className="flex size-[140px] items-center justify-center rounded-full bg-brand-accent-subtle">
                <Icon3d name={s.icon} size={92} className="w-[92px] -rotate-6 transition-[rotate] duration-500 group-hover:rotate-3" />
              </span>
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-full bg-brand-primary text-caption font-medium text-text-inverse"
              >
                {s.n}
              </span>
              <h3 className="text-body-1 font-semibold">{s.title}</h3>
              <p className="text-body-2 text-text-secondary">{s.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
