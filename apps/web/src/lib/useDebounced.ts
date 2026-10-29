"use client";

import { useEffect, useState } from "react";

/** The value, but only after it stopped changing for `delay` ms (keeps a search box from firing a request per key). */
export function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
