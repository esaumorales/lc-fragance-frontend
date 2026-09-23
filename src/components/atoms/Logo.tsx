import Image from "next/image";
import { cn } from "@/lib/cn";

// El emblema sale de scripts/build-brand-emblem.py: recortado y transparente,
// asi sirve igual en tema claro y oscuro.
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("brand-lockup", compact && "brand-compact", className)}>
      <span className="brand-emblem">
        <Image src="/brand/emblem.webp" alt="" width={173} height={205} priority />
      </span>
      <span className="brand-type">
        <span className="brand-wordmark">LC FRAGANCE</span>
        <span className="brand-tagline">EL ARTE DE DISTINGUIRTE</span>
      </span>
    </span>
  );
}
