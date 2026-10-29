import type { Metadata } from "next";
import { Placeholder } from "@/components/app/Placeholder";

export const metadata: Metadata = { title: "Recap" };

export default function Page() {
  return <Placeholder title="Recap" icon="recap" text="Your month by category, with a budget and a projection, is on its way. It already works in the mobile app." />;
}
