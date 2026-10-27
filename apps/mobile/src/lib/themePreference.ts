import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type ThemePreference = "system" | "light" | "dark";

export const themePreferences: ThemePreference[] = ["system", "light", "dark"];

const KEY = "notarik.theme";

let current: ThemePreference = "system";
const listeners = new Set<() => void>();

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (themePreferences as string[]).includes(value);
}

export function getThemePreference(): ThemePreference {
  return current;
}

export function subscribeThemePreference(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(next: ThemePreference) {
  current = next;
  listeners.forEach((listener) => listener());
}

// The choice is per device and not secret, so it stays out of the API.
export async function setThemePreference(next: ThemePreference): Promise<void> {
  publish(next);
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(KEY, next);
    else await SecureStore.setItemAsync(KEY, next);
  } catch {
    // Storage can be blocked (private window); the choice then lasts until the app closes.
  }
}

export async function restoreThemePreference(): Promise<void> {
  try {
    const stored =
      Platform.OS === "web" ? (globalThis.localStorage?.getItem(KEY) ?? null) : await SecureStore.getItemAsync(KEY);
    if (isThemePreference(stored)) publish(stored);
  } catch {
    // Keep the default.
  }
}

export function themeLabel(preference: ThemePreference): string {
  return preference === "system" ? "System" : preference === "light" ? "Light" : "Dark";
}
