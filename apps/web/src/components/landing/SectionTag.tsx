import type { ReactNode } from "react";
import { Icon3d, type IconName } from "./Icon3d";

export function SectionTag({
  icon,
  children,
  className = "",
}: {
  icon: IconName;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-brand-accent-subtle py-1.5 pr-[18px] pl-2 text-caption font-medium text-brand-primary-strong ${className}`}
    >
      <Icon3d name={icon} size={24} className="w-6" />
      {children}
    </span>
  );
}
