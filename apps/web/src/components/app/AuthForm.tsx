"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { GoogleButton } from "./GoogleButton";

const noSubscription = () => () => {};
const svg = (name: string) => `/app-assets/svg/${name}.svg`;

function Field({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex h-14 items-center gap-3 rounded-2xl bg-surface-subtle px-4 focus-within:ring-2 focus-within:ring-brand-accent">
      <Image src={svg(icon)} alt="" width={20} height={20} unoptimized className="shrink-0" />
      {children}
    </div>
  );
}

const input = "min-w-0 flex-1 bg-transparent text-caption outline-none placeholder:text-text-secondary";

/** Login and Create account, in the mobile app's layout: back button, headline, filled fields, primary button. */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Before hydration the form would submit natively and put the password in the URL, so keep the button off until the handler is attached.
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  const signup = mode === "signup";
  const canSubmit = hydrated && !busy && email.trim().length > 0 && password.length > 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, ...(signup && name.trim() ? { name: name.trim() } : {}) }),
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
    <div className="flex w-full max-w-sm flex-1 flex-col gap-6 md:flex-none md:rounded-3xl md:bg-surface-default md:p-8">
      <Link href="/" aria-label="Back" className="flex size-12 items-center justify-center rounded-full bg-border-default md:hidden">
        <Image src={svg("login-chevron-left")} alt="" width={24} height={24} unoptimized />
      </Link>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {!signup && (
          <p className="flex items-center gap-1.5 text-body-1 font-semibold md:hidden">
            <Image src={svg("login-mark")} alt="" width={22} height={19} unoptimized />
            notarik
          </p>
        )}
        <h1 className="font-heading text-[40px] leading-[48px] font-bold tracking-[-1.6px] md:text-headline-4 md:tracking-normal">
          {signup ? (
            <>
              Create your
              <br className="md:hidden" /> account
            </>
          ) : (
            "Welcome back"
          )}
        </h1>
        <p className="text-caption text-text-secondary">{signup ? "It takes less than a minute." : "Log in to pick up where you left off."}</p>

        {signup && (
          <Field icon="signup-user">
            <input aria-label="Name" placeholder="Your name" autoComplete="name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className={input} />
          </Field>
        )}
        <Field icon="login-mail">
          <input aria-label="Email" type="email" placeholder="you@email.com" autoComplete="email" autoCapitalize="none" autoCorrect="off" value={email} onChange={(event) => setEmail(event.target.value)} className={input} />
        </Field>
        <Field icon="login-lock">
          <input
            aria-label="Password"
            type={show ? "text" : "password"}
            placeholder={signup ? "Create a password" : "Password"}
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={signup ? 8 : undefined}
            maxLength={200}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={input}
          />
          <button type="button" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow((value) => !value)} className={show ? "opacity-50" : ""}>
            <Image src={svg("login-eye")} alt="" width={20} height={20} unoptimized />
          </button>
        </Field>

        {!signup && (
          <div className="flex justify-end">
            <button type="button" onClick={() => setError("Password reset is not available yet")} className="text-caption font-medium text-brand-primary-strong">
              Forgot password?
            </button>
          </div>
        )}
        {signup && <p className="text-caption-small text-text-secondary">By creating an account, you agree to our Terms and Privacy Policy. Use at least 8 characters for the password.</p>}

        {error && (
          <p role="alert" className="text-caption text-status-danger-text">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-1 h-[52px] rounded-xl bg-brand-primary font-heading text-button-1 font-bold text-text-inverse transition-colors hover:bg-brand-primary-strong disabled:opacity-50"
        >
          {busy ? "Please wait…" : signup ? "Create account" : "Log in"}
        </button>
        <GoogleButton />
      </form>

      <p className="mt-auto flex justify-center gap-1.5 text-caption text-text-secondary md:mt-0">
        {signup ? "Already have an account?" : "New here?"}
        <Link replace href={signup ? "/login" : "/signup"} className="font-medium text-brand-primary-strong hover:underline">
          {signup ? "Log in" : "Sign up"}
        </Link>
      </p>
    </div>
  );
}
