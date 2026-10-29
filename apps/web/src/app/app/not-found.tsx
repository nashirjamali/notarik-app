import Link from "next/link";
import { Card } from "@/components/app/ui";

export default function AppNotFound() {
  return (
    <Card className="flex flex-col items-start gap-3">
      <h1 className="font-heading text-body-1 font-bold">Page not found</h1>
      <p className="text-caption text-text-secondary">There is nothing at this address.</p>
      <Link href="/app" className="rounded-full bg-brand-primary px-5 py-2.5 text-button-2 font-bold text-text-inverse hover:bg-brand-primary-strong">
        Back to Home
      </Link>
    </Card>
  );
}
