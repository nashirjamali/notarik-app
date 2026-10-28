import Image from "next/image";

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
};

/** Decorative 3D icon from the app (public/icons). */
export function Icon3d({ name, size = 128, className = "" }: Props) {
  return (
    <Image
      src={`/icons/${name}.png`}
      alt=""
      width={size}
      height={size}
      className={`h-auto select-none ${className}`}
      draggable={false}
    />
  );
}
