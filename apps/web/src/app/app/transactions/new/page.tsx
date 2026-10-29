import type { Metadata } from "next";
import { QuickAddView } from "@/components/app/QuickAddView";

export const metadata: Metadata = { title: "Add expense" };

export default function Page() {
  return <QuickAddView />;
}
