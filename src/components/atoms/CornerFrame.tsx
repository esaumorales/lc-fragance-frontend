import { cn } from "@/lib/cn";

// Marco decorativo de esquinas doradas, inspirado en los detalles de marco
// de las referencias de diseño (.skills). Puramente decorativo.
export function CornerFrame({ className }: { className?: string }) {
  const corner = "absolute h-3 w-3 border-primary/60";

  return (
    <div className={cn("pointer-events-none absolute inset-0", className)}>
      <span className={cn(corner, "left-0 top-0 border-l border-t")} />
      <span className={cn(corner, "right-0 top-0 border-r border-t")} />
      <span className={cn(corner, "bottom-0 left-0 border-b border-l")} />
      <span className={cn(corner, "bottom-0 right-0 border-b border-r")} />
    </div>
  );
}
