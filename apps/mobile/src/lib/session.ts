import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "notarik.session";

export type Session = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

let session: Session | null = null;
const listeners = new Set<() => void>();

export function getSession(): Session | null {
  return session;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(next: Session | null) {
  session = next;
  listeners.forEach((listener) => listener());
}

async function readRaw(): Promise<string | null> {
  if (Platform.OS === "web") {
    return globalThis.localStorage?.getItem(KEY) ?? null;
  }
  return SecureStore.getItemAsync(KEY);
}

async function writeRaw(value: string | null): Promise<void> {
  if (Platform.OS === "web") {
    if (value == null) globalThis.localStorage?.removeItem(KEY);
    else globalThis.localStorage?.setItem(KEY, value);
    return;
  }
  if (value == null) await SecureStore.deleteItemAsync(KEY);
  else await SecureStore.setItemAsync(KEY, value);
}

export async function saveSession(next: Session): Promise<void> {
  await writeRaw(JSON.stringify(next));
  publish(next);
}

export async function clearSession(): Promise<void> {
  await writeRaw(null);
  publish(null);
}

export async function restoreSession(): Promise<Session | null> {
  const raw = await readRaw();
  if (!raw) {
    publish(null);
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Session;
    publish(parsed);
    return parsed;
  } catch {
    await clearSession();
    return null;
  }
}

export function accessTokenExpired(token: string, now = Date.now()): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const json = JSON.parse(
      globalThis.atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    return typeof json.exp !== "number" || json.exp * 1000 <= now + 15_000;
  } catch {
    return true;
  }
}
