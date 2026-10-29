"use client";

import { useSyncExternalStore } from "react";
import { currentMonth, today } from "./months";

const subscribe = () => () => {};
const read = () => {
  const now = new Date();
  return `${today(now)}T${String(now.getHours()).padStart(2, "0")}`;
};

/**
 * The browser's date, or null while rendering on the server. Reading `new Date()` during prerender would freeze
 * the build time into the page, so date-based screens show a skeleton until they hydrate.
 */
export function useClock(): { today: string; month: string; hour: number } | null {
  const stamp = useSyncExternalStore(subscribe, read, () => null);
  if (!stamp) return null;
  const [day, hour] = stamp.split("T");
  return { today: day, month: currentMonth(new Date(`${day}T12:00:00`)), hour: Number(hour) };
}
