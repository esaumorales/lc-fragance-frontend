"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/atoms/Icon";
import { Button } from "@/components/atoms/Button";

/**
 * Cuando algo falla y no es que la pagina no exista.
 *
 * Lo mas comun: la API no contesta. Decirlo asi y no con un 404 importa,
 * porque son cosas distintas: una direccion mal escrita no se arregla
 * reintentando, y esto si.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Al log del navegador: sin esto, averiguar que fallo obliga a reproducirlo.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="pantalla-de-aviso pantalla-de-aviso--sola">
      <Icon icon="mdi:cloud-off-outline" className="h-8 w-8 text-primary" />
      <h1>No pudimos cargar esta página</h1>
      <p className="pantalla-de-aviso-texto">
        Puede ser algo pasajero. Probá de nuevo en un momento; si sigue igual, escribinos y lo
        vemos.
      </p>

      <div className="pantalla-de-aviso-acciones">
        <Button variant="primary" onClick={reset}>
          Reintentar
        </Button>
        <Link href="/" className="editorial-link">
          Ir al inicio <span>↗</span>
        </Link>
      </div>

      {/* El identificador que Next le pone al error: con el, un reporte deja
          de ser "no me carga" y se vuelve rastreable. */}
      {error.digest ? (
        <p className="pantalla-de-aviso-codigo-error">Referencia: {error.digest}</p>
      ) : null}
    </div>
  );
}
