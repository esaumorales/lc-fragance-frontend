"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";

type Props = {
  titulo: string;
  detalle: string;
  // Falso cuando el servidor no pudo mandar el correo: el código quedó en su log.
  correoEnviado: boolean;
  // Lo que se hace con el código; si falla, el mensaje se muestra acá adentro.
  onConfirmar: (codigo: string) => Promise<void>;
  onCerrar: () => void;
};

/**
 * Pide el codigo que autoriza una accion que no se puede deshacer.
 *
 * El codigo ya fue enviado antes de abrir esto: asi quien confirma lo tiene a
 * mano en vez de descubrir recien aca que tiene que ir a buscarlo.
 */
export function ConfirmacionDialog({
  titulo,
  detalle,
  correoEnviado,
  onConfirmar,
  onCerrar,
}: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [codigo, setCodigo] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    nodo.showModal();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      nodo.close();
      document.body.style.overflow = anterior;
    };
  }, []);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (confirmando || codigo.length !== 6) return;
    setConfirmando(true);
    setError(null);
    try {
      await onConfirmar(codigo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo confirmar");
      setCodigo("");
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <dialog
      ref={dialogo}
      className="admin-dialog"
      aria-labelledby="titulo-confirmacion"
      onCancel={(e) => {
        e.preventDefault();
        onCerrar();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <form onSubmit={enviar} className="flex flex-col gap-5 p-6 sm:p-8">
        <div>
          <p className="caps text-primary">Confirmación</p>
          <h2 id="titulo-confirmacion" className="mt-2 font-serif text-2xl">
            {titulo}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{detalle}</p>
        </div>

        {correoEnviado ? (
          <p className="text-sm text-muted-foreground">
            Te mandamos un código de seis dígitos a tu correo. Vence en 10 minutos.
          </p>
        ) : (
          <p role="alert" className="border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-600">
            El servidor no pudo mandar el correo, así que el código quedó en su registro. Pedíselo a
            quien administra el sistema.
          </p>
        )}

        <label className="auth-label">
          Código
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
            required
            autoFocus
            placeholder="000000"
            className="w-full text-center text-2xl tracking-[0.5em]"
          />
        </label>

        {error ? (
          <p role="alert" className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-400">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-4">
          <button
            type="button"
            onClick={onCerrar}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancelar
          </button>
          <Button type="submit" disabled={confirmando || codigo.length !== 6} className="gap-2">
            <Icon icon="mdi:shield-check-outline" />
            {confirmando ? "Confirmando…" : "Confirmar"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
