import type { Metadata } from "next";
import { NewExpenseView } from "@/components/app/NewExpenseView";

export const metadata: Metadata = { title: "Add expense" };

export default function Page() {
  return <NewExpenseView />;
}
