import type { Metadata } from "next";
import { EditBudgetsView } from "@/components/app/EditBudgetsView";

export const metadata: Metadata = { title: "Edit budgets" };

export default function Page() {
  return <EditBudgetsView />;
}
