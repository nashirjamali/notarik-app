import Image from "next/image";
import type { CSSProperties } from "react";

export type IconName =
  | "quick-add"
  | "recap"
  | "budget"
  | "receipt"
  | "groceries"
  | "coffee"
  | "transport"
  | "bills"
  | "rice"
  | "camera"
  | "mic";

type Props = {
  name: IconName;
  /** Intrinsic size hint in px. The rendered size comes from className (e.g. "w-28"). */
  size?: number;
  className?: string;
  /** Makes the icon bob up and down; the number is the start delay in seconds. */
  float?: number;
};

/** Decorative 3D icon from the app (public/icons). */
export function Icon3d({ name, size = 128, className = "", float }: Props) {
  return (
    <Image
      src={`/icons/${name}.png`}
      alt=""
      width={size}
      height={size}
      className={`h-auto select-none ${float === undefined ? "" : "float"} ${className}`}
      style={float === undefined ? undefined : ({ "--float-delay": `${float}s`, "--float-duration": `${5 + (float % 2)}s` } as CSSProperties)}
      draggable={false}
    />
  );
}
