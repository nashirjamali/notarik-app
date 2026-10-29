import type { Metadata } from "next";
import { Placeholder } from "@/components/app/Placeholder";

export const metadata: Metadata = { title: "Ask Notarik" };

export default function Page() {
  return <Placeholder title="Ask Notarik" icon="budget" text="The chat assistant is coming to the web. For now, ask it in the mobile app." />;
}
