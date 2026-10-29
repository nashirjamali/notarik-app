import { redirect } from "next/navigation";

/** The mobile app calls this screen Chat; keep the old address working. */
export default function Page() {
  redirect("/app/chat");
}
