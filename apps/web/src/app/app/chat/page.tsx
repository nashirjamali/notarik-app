import type { Metadata } from "next";
import { AskView } from "@/components/app/AskView";

export const metadata: Metadata = { title: "Chat" };

export default function Page() {
  return <AskView />;
}
