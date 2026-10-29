"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID, loadGoogle, nonceFromBytes } from "@/lib/google";

/**
 * "Continue with Google" through Google Identity Services. Google draws the button and hands back an
 * ID token; our server checks it and sets the session cookies. The same call signs in or creates the account.
 */
export function GoogleButton({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const slot = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !slot.current) return;
    const element = slot.current;
    const nonce = nonceFromBytes(crypto.getRandomValues(new Uint8Array(16)));
    let cancelled = false;
    loadGoogle()
      .then((google) => {
        if (cancelled) return;
        google.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce,
          callback: async ({ credential }) => {
            setError(null);
            try {
              const res = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ id_token: credential, nonce }),
              });
              if (!res.ok) {
                const payload = await res.json().catch(() => null);
                return setError(typeof payload?.message === "string" ? payload.message : "Google sign-in failed");
              }
              router.replace("/app");
            } catch {
              setError("Cannot reach the server. Try again.");
            }
          },
        });
        google.renderButton(element, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: mode === "signup" ? "signup_with" : "continue_with",
          width: 320,
        });
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [mode, router]);

  if (!GOOGLE_CLIENT_ID) return null;
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="flex w-full items-center gap-3 text-caption text-text-secondary before:h-px before:flex-1 before:bg-border-default after:h-px after:flex-1 after:bg-border-default">or</p>
      <div ref={slot} className="flex min-h-10 justify-center" />
      {error && (
        <p role="alert" className="w-full rounded-2xl bg-status-danger-subtle px-4 py-3 text-caption text-status-danger">
          {error}
        </p>
      )}
    </div>
  );
}
