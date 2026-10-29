import type { Metadata } from "next";
import { ScanReceiptView } from "@/components/app/ScanReceiptView";

export const metadata: Metadata = { title: "Scan receipt" };

export default function Page() {
  return <ScanReceiptView />;
}
