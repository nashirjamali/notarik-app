export type GuardState = "loading" | "auth" | "app";

export function destination(
  ready: boolean,
  session: { accessToken: string } | null,
): GuardState {
  if (process.env.EXPO_PUBLIC_DEV_SKIP_AUTH === 'true') {
    return ready ? "app" : "loading";
  }
  if (!ready) return "loading";
  return session ? "app" : "auth";
}
