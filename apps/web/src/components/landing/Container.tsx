import type { ComponentProps } from "react";

/** Page width and side padding from the Figma frames (390 / 768 / 1440); below 1440 the side padding stays at 48px so 1024-1279 keep room. */
export function Container({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`mx-auto w-full max-w-[1440px] px-5 md:px-12 min-[1440px]:px-[120px] ${className}`}
      {...props}
    />
  );
}
