import type { Metadata } from "next";
import { TransactionDetail } from "@/components/app/TransactionDetail";

export const metadata: Metadata = { title: "Expense" };

export default function Page() {
  return <TransactionDetail />;
}
