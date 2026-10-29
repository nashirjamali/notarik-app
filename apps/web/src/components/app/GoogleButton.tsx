"use client";

import { useEffect, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID, loadGoogle, nonceFromBytes } from "@/lib/google";

/**
 * "Continue with Google" through Google Identity Services. Google draws the button and hands back an
 * ID token; our server checks it and sets the session cookies. The same call signs in or creates the account,
 * so both pages say "Continue with Google".
 */
export function GoogleButton() {
  const slot = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

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
              // A full navigation on purpose: the session cookie is new, so drop the router cache (it may hold a
              // redirect to /login from before) and let the server render /app with the cookie.
              setSigningIn(true);
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.assign("/app");
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
          text: "continue_with",
          // The rest of the app is in English; without this Google follows the browser language.
          locale: "en",
          width: 320,
        });
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="flex w-full items-center gap-3 text-caption text-text-secondary before:h-px before:flex-1 before:bg-border-default after:h-px after:flex-1 after:bg-border-default">or</p>
      <div ref={slot} className="flex min-h-10 justify-center" />
      {signingIn && (
        <p role="status" className="text-caption text-text-secondary">
          Signing you in…
        </p>
      )}
      {error && (
        <p role="alert" className="w-full rounded-2xl bg-status-danger-subtle px-4 py-3 text-caption text-status-danger">
          {error}
        </p>
      )}
    </div>
  );
}
