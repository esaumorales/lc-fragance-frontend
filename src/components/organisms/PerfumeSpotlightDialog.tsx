"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ThemeToggle } from "@/components/atoms/ThemeToggle";
import type { PerfumeDeVitrina } from "@/data/perfumes-vitrina";

type Props = { perfume: PerfumeDeVitrina | null; onClose: () => void };

export function PerfumeSpotlightDialog({ perfume, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const nodo = dialog.current;
    if (!nodo || !perfume) return;

    nodo.showModal();
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
      if (nodo.open) nodo.close();
    };
  }, [perfume]);

  return (
    <dialog
      ref={dialog}
      className="perfume-spotlight"
      aria-label={perfume ? `Detalle de ${perfume.nombre}` : "Detalle de perfume"}
      onCancel={(evento) => { evento.preventDefault(); onClose(); }}
    >
      {perfume && (
        <div className="perfume-spotlight-contenido">
          <div className="perfume-spotlight-barra">
            <span>LC FRAGANCE <i>✦</i> LA COLECCIÓN</span>
            <div className="perfume-spotlight-acciones">
              <ThemeToggle />
              <button type="button" onClick={onClose} aria-label="Volver a la vitrina">✕</button>
            </div>
          </div>
          <div className="perfume-spotlight-cuerpo">
            <div className="perfume-spotlight-texto">
              <p className="eyebrow">UNA PIEZA PARA DESCUBRIR</p>
              <p className="perfume-spotlight-numero">VISTA INMERSIVA / LC FRAGANCE</p>
              <h2>{perfume.nombre}</h2>
              <p className="perfume-spotlight-nota">{perfume.nota}</p>
              <p className="perfume-spotlight-descripcion">{perfume.detalle}</p>
              <Link href={perfume.href} onClick={onClose} className="perfume-spotlight-cta">
                Explorar perfumes <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="perfume-spotlight-escena">
              <span className="perfume-spotlight-resplandor" aria-hidden="true" />
              <div className="perfume-spotlight-modelo">
                {/* La foto frontal permanece montada: no hay saltos de carga entre ángulos. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={perfume.imagen} alt={perfume.nombre} draggable={false} fetchPriority="high" />
              </div>
              <span className="perfume-spotlight-piso" aria-hidden="true" />
              <span className="perfume-spotlight-vertical" aria-hidden="true">LC FRAGANCE / DISTINGUIRTE</span>
            </div>
          </div>
          <div className="perfume-spotlight-pie">
            <span>UNA ESENCIA. TU IDENTIDAD.</span>
            <span className="perfume-spotlight-movimiento" aria-hidden="true"><i /> EN MOVIMIENTO</span>
          </div>
        </div>
      )}
    </dialog>
  );
}
