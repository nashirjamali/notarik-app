import type { Metadata } from "next";
import { AuthForm } from "@/components/app/AuthForm";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default function Page() {
  return <AuthForm mode="login" />;
}
