import type { CSSProperties } from "react";

/** Spread onto an element to fade it up when it scrolls into view (see RevealObserver). Delay is in ms. */
export function reveal(delay = 0) {
  return { "data-reveal": "", style: { "--d": `${delay}ms` } as CSSProperties };
}

/** Spread onto an element to fade it up on page load (hero). Delay is in ms. */
export function rise(delay = 0) {
  return { "data-rise": "", style: { "--d": `${delay}ms` } as CSSProperties };
}
