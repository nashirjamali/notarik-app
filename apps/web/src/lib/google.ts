/** Public OAuth client ID of the web app (not a secret). Without it the Google button is not shown. */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

/** A random nonce as hex. Google copies it into the ID token and the API compares it. */
export function nonceFromBytes(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

type Credential = { credential: string };
type GoogleId = {
  initialize(options: { client_id: string; nonce: string; callback: (response: Credential) => void }): void;
  renderButton(element: HTMLElement, options: Record<string, unknown>): void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const SCRIPT = "https://accounts.google.com/gsi/client";
let loading: Promise<GoogleId> | null = null;

/** Loads Google Identity Services once. */
export function loadGoogle(): Promise<GoogleId> {
  if (window.google) return Promise.resolve(window.google.accounts.id);
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => (window.google ? resolve(window.google.accounts.id) : reject(new Error("Google sign-in is not available")));
    script.onerror = () => {
      loading = null;
      reject(new Error("Could not load Google sign-in"));
    };
    document.head.append(script);
  });
  return loading;
}
