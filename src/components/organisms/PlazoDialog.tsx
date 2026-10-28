"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { cn } from "@/lib/cn";

// Las de siempre, para no escribirlas cada vez. El campo libre queda igual:
// el plazo real depende del pedido y de la agenda de la tienda.
const SUGERIDOS = ["Hoy mismo", "Mañana", "En 2 o 3 días", "Esta semana"];

type Props = {
  pedido: string;
  onConfirmar: (plazo: string) => void;
  onCerrar: () => void;
};

export function PlazoDialog({ pedido, onConfirmar, onCerrar }: Props) {
  const [plazo, setPlazo] = useState("");

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const elegido = plazo.trim();
    if (elegido.length >= 2) onConfirmar(elegido);
  }

  return (
    <div className="dialogo-fondo" role="dialog" aria-modal="true" aria-label="Aceptar el pedido">
      <form onSubmit={enviar} className="dialogo-caja">
        <h2 className="font-serif text-xl text-foreground">Aceptar el pedido #{pedido}</h2>
        <p className="text-sm text-muted-foreground">
          ¿Para cuándo lo tenés? Se lo mandamos por correo junto con la confirmación.
        </p>

        <div className="flex flex-wrap gap-2">
          {SUGERIDOS.map((opcion) => (
            <button
              key={opcion}
              type="button"
              onClick={() => setPlazo(opcion)}
              aria-pressed={plazo === opcion}
              className={cn(
                "border px-3 py-2 text-xs transition-colors",
                plazo === opcion
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/60"
              )}
            >
              {opcion}
            </button>
          ))}
        </div>

        <Input
          aria-label="Plazo de entrega"
          placeholder="O escribilo: entre el jueves y el viernes"
          value={plazo}
          onChange={(e) => setPlazo(e.target.value)}
          required
          minLength={2}
          maxLength={80}
        />

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" disabled={plazo.trim().length < 2}>
            Aceptar y avisar
          </Button>
          <Button type="button" variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
