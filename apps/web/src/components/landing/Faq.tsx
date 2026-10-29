import { Container } from "./Container";
import { Icon3d, type IconName } from "./Icon3d";
import { reveal } from "./motion";
import { SectionTag } from "./SectionTag";

const faqs: { q: string; a: string; icon: IconName }[] = [
  { q: "Is my data safe?", a: "Every table is protected per user, and the assistant can only read your own data.", icon: "bills" },
  { q: "Can the assistant change my expenses?", a: "Only by proposing a change. You confirm before anything is saved.", icon: "quick-add" },
  { q: "Which currency does it use?", a: "Indonesian Rupiah, stored as whole numbers so totals are always exact.", icon: "budget" },
  { q: "What if the receipt is read wrong?", a: "You review every receipt first, and a plain-code validator checks the totals.", icon: "receipt" },
];

export function Faq() {
  return (
    <section id="faq" className="pb-14 md:pb-[72px] lg:pb-24">
      <Container className="flex flex-col gap-8 lg:flex-row lg:gap-16">
        <div className="flex flex-col items-start gap-5 lg:w-[360px] lg:shrink-0" {...reveal()}>
          <SectionTag icon="bills">FAQ</SectionTag>
          <h2 className="font-heading text-headline-4 font-bold md:text-headline-3">Questions, answered</h2>
          <p className="text-body-2 text-text-secondary">Still curious? We keep things simple on purpose.</p>
          <Icon3d name="mic" size={96} className="w-24 -rotate-[8deg]" />
        </div>
        <ul className="flex flex-1 flex-col gap-4">
          {faqs.map((f, n) => (
            <li
              key={f.q}
              className="flex items-center gap-3 rounded-[1.75rem] bg-surface-subtle py-5 pr-[18px] pl-3.5 hover:scale-[1.01] md:gap-[18px] md:pr-7 md:pl-5"
              {...reveal(n * 100)}
            >
              <span className="flex size-[60px] shrink-0 items-center justify-center rounded-[18px] bg-surface-default">
                <Icon3d name={f.icon} size={44} className="w-11" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-body-2 font-medium">{f.q}</p>
                <p className="text-caption text-text-secondary">{f.a}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
