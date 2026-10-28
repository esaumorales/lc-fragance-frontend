"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/atoms/Icon";

type Props = {
  etiqueta: string;
  valor: string;
  /** El titular no se copia: es para leer, no para pegar en una app. */
  copiable?: boolean;
};

export function CampoParaCopiar({ etiqueta, valor, copiable = true }: Props) {
  const [copiado, setCopiado] = useState(false);

  // El aviso vuelve solo a su lugar; sin limpiar el reloj, un desmontaje en
  // el medio deja un setState sobre algo que ya no existe.
  useEffect(() => {
    if (!copiado) return;
    const reloj = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(reloj);
  }, [copiado]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
    } catch {
      // Sin permiso para el portapapeles queda el numero a la vista igual.
    }
  }

  if (!valor) return null;

  return (
    <div className="campo-copiar">
      <span className="campo-copiar-etiqueta">{etiqueta}</span>
      <span className="campo-copiar-valor">{valor}</span>
      {copiable ? (
        <button type="button" onClick={copiar} className="campo-copiar-boton">
          {copiado ? (
            <>
              <Icon icon="mdi:check" className="h-3.5 w-3.5" /> Copiado
            </>
          ) : (
            "Copiar"
          )}
        </button>
      ) : null}
    </div>
  );
}
