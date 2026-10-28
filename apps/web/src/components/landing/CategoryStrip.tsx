import { Container } from "./Container";
import { Icon3d, type IconName } from "./Icon3d";

const items: { icon: IconName; label: string }[] = [
  { icon: "groceries", label: "Groceries" },
  { icon: "coffee", label: "Food & Drink" },
  { icon: "transport", label: "Transport" },
  { icon: "bills", label: "Bills" },
  { icon: "receipt", label: "Receipts" },
  { icon: "budget", label: "Budgets" },
];

export function CategoryStrip() {
  return (
    <section className="bg-surface-subtle py-8 md:py-10 lg:py-12">
      <Container className="flex flex-col items-center gap-6">
        <p className="text-center text-body-2 font-medium text-text-secondary">
          Every kind of spending, sorted for you
        </p>
        <ul className="flex w-full flex-wrap justify-center gap-3 lg:justify-between">
          {items.map((i) => (
            <li
              key={i.label}
              className="flex items-center gap-2.5 rounded-full bg-surface-default py-2.5 pr-[22px] pl-2.5"
            >
              <Icon3d name={i.icon} size={40} className="w-10" />
              <span className="text-body-2 font-medium">{i.label}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
