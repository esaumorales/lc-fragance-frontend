import { cn } from "@/lib/cn";

// Silueta propia del frasco facetado de LC Fragance (coincide con el modelo 3D),
// en vez del ícono genérico de línea de Iconify. Puramente decorativa.
export function BottleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-16 w-16", className)}
    >
      <path
        d="M42 8H58V22L66 30V38L74 46L80 62L74 82L58 100H42L26 82L20 62L26 46L34 38V30L42 22V8Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M34 38L50 46L66 38M20 62L50 70L80 62M26 46L50 56L74 46M26 82L50 90L74 82"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.6"
      />
      <rect x="42" y="8" width="16" height="8" stroke="currentColor" strokeWidth="2.5" />
      <path d="M50 100V108" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M50 108C53.3 108 56 110.7 56 114C56 117.3 53.3 118 50 118C46.7 118 44 117.3 44 114C44 110.7 46.7 108 50 108Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

