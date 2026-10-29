import type { Metadata } from "next";
import { AskView } from "@/components/app/AskView";

export const metadata: Metadata = { title: "Ask Notarik" };

export default function Page() {
  return <AskView />;
}
