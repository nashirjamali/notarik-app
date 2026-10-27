// Pure helpers for Google sign-in, kept apart from the Expo modules so they are easy to test.

const SUFFIX = ".apps.googleusercontent.com";

/** Google sends the user back to this scheme for an iOS client: the client ID, reversed. */
export function reversedClientId(iosClientId: string): string {
  const id = iosClientId.endsWith(SUFFIX) ? iosClientId.slice(0, -SUFFIX.length) : iosClientId;
  return `com.googleusercontent.apps.${id}`;
}

export function iosRedirectUri(iosClientId: string): string {
  return `${reversedClientId(iosClientId)}:/oauthredirect`;
}

/** A random nonce as hex; Google copies it into the ID token and the API compares it. */
export function nonceFromBytes(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
