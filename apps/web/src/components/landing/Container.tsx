import type { ComponentProps } from "react";

/** Page width and side padding from the Figma frames (390 / 768 / 1440). */
export function Container({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`mx-auto w-full max-w-[1440px] px-5 md:px-12 lg:px-[120px] ${className}`}
      {...props}
    />
  );
}
