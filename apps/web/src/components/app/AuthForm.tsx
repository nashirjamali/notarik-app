"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";

const noSubscription = () => () => {};
import { GoogleButton } from "./GoogleButton";

const field =
  "w-full rounded-2xl border border-border-default bg-surface-default px-4 py-3 text-body-2 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-accent";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Before hydration the form would submit natively and put the password in the URL, so keep the button off until the handler is attached.
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  const signup = mode === "signup";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const body = {
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
      ...(signup && name ? { name } : {}),
    };
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setError(typeof payload?.message === "string" ? payload.message : "Something went wrong");
        return;
      }
      router.replace("/app");
    } catch {
      setError("Cannot reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-surface-default p-6 md:p-8">
      <h1 className="font-heading text-headline-4 font-bold">{signup ? "Create your account" : "Welcome back"}</h1>
      {signup && (
        <label className="flex flex-col gap-1.5 text-caption font-medium">
          Name
          <input name="name" autoComplete="name" maxLength={80} className={field} />
        </label>
      )}
      <label className="flex flex-col gap-1.5 text-caption font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" className={field} />
      </label>
      <label className="flex flex-col gap-1.5 text-caption font-medium">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={signup ? 8 : 1}
          maxLength={200}
          autoComplete={signup ? "new-password" : "current-password"}
          className={field}
        />
        {signup && <span className="text-caption-small font-normal text-text-secondary">At least 8 characters.</span>}
      </label>
      {error && (
        <p role="alert" className="rounded-2xl bg-status-danger-subtle px-4 py-3 text-caption text-status-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !hydrated}
        className="h-13 rounded-full bg-brand-primary font-heading text-button-1 font-bold text-text-inverse transition-colors hover:bg-brand-primary-strong disabled:opacity-60"
      >
        {busy ? "Please wait…" : signup ? "Create account" : "Log in"}
      </button>
      <GoogleButton />
      <p className="text-center text-caption text-text-secondary">
        {signup ? "Already have an account? " : "New to Notarik? "}
        <Link href={signup ? "/login" : "/signup"} className="font-medium text-brand-primary-strong hover:underline">
          {signup ? "Log in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
