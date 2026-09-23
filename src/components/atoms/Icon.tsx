import { Icon as IconifyIcon } from "@iconify/react";
import { cn } from "@/lib/cn";

type IconProps = {
  icon: string;
  className?: string;
};

export function Icon({ icon, className }: IconProps) {
  return <IconifyIcon icon={icon} className={cn("inline-block h-5 w-5", className)} />;
}
