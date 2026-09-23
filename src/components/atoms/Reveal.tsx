"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type RevealProps = {
  children: React.ReactNode;
  /** Retraso en ms, sirve para escalonar varios bloques seguidos. */
  delay?: number;
  className?: string;
};

// Si el observador no responde en este plazo, el bloque se muestra igual.
const RED_DE_SEGURIDAD_MS = 1200;

// Revela el bloque cuando entra en pantalla, para que la pagina no aparezca plana al bajar.
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // El segundo caso cubre al bloque que ya quedo por encima de la pantalla:
        // si se salta hasta el sin pasar por el medio, nunca llega a intersecar.
        if (!entry.isIntersecting && entry.boundingClientRect.top > 0) return;
        setShown(true);
        observer.disconnect();
      },
      // Dispara un poco antes del borde inferior para que no se vea el salto.
      { rootMargin: "0px 0px -12% 0px" }
    );
    observer.observe(node);

    // El navegador congela el observador en pestañas ocultas: sin esto el
    // contenido podria quedar invisible de forma permanente.
    const red = setTimeout(() => setShown(true), RED_DE_SEGURIDAD_MS);

    return () => {
      observer.disconnect();
      clearTimeout(red);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn("reveal", shown && "reveal-visible", className)}
    >
      {children}
    </div>
  );
}
