import { notFound } from "next/navigation";

/** Unknown /app/... addresses render the app's own not-found page inside the shell. */
export default function Page() {
  notFound();
}
