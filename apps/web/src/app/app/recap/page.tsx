import type { Metadata } from "next";
import { RecapView } from "@/components/app/RecapView";

export const metadata: Metadata = { title: "Recap" };

export default function Page() {
  return <RecapView />;
}
