export type GuardState = "loading" | "auth" | "app";

export function destination(
  ready: boolean,
  session: { accessToken: string } | null,
): GuardState {
  if (!ready) return "loading";
  return session ? "app" : "auth";
}
