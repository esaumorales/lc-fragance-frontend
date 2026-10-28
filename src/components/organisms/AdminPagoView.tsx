"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  borrarConfiguracion,
  guardarConfiguracion,
  obtenerConfiguracion,
} from "@/lib/pago-api";
import type { ConfiguracionDePago } from "@/lib/types";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";

const VACIO = {
  titular: "",
  yape: "",
  banco: "",
  cuenta: "",
  cci: "",
  correoDeAvisos: "",
  recojoActivo: true,
  deliveryActivo: true,
  costoDelivery: "0",
};

type Formulario = typeof VACIO;

function desdeLaApi(config: ConfiguracionDePago): Formulario {
  return {
    titular: config.titular ?? "",
    yape: config.yape ?? "",
    banco: config.banco ?? "",
    cuenta: config.cuenta ?? "",
    cci: config.cci ?? "",
    correoDeAvisos: config.correoDeAvisos ?? "",
    recojoActivo: config.recojoActivo,
    deliveryActivo: config.deliveryActivo,
    costoDelivery: String(config.costoDelivery ?? "0"),
  };
}

export function AdminPagoView() {
  const { accessToken } = useAuth();
  const [form, setForm] = useState<Formulario>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    // Guarda de cancelacion: si el token cambia mientras la peticion vuela,
    // la respuesta vieja no debe pisar el formulario.
    let vivo = true;
    obtenerConfiguracion(accessToken)
      .then((config) => {
        if (vivo) setForm(desdeLaApi(config));
      })
      .catch(() => {
        if (vivo) setError("No se pudo cargar la configuración");
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });

    return () => {
      vivo = false;
    };
  }, [accessToken]);

  function cambiar<C extends keyof Formulario>(campo: C, valor: Formulario[C]) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
    setAviso(null);
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (!accessToken) return;

    setGuardando(true);
    setError(null);
    try {
      const guardado = await guardarConfiguracion(accessToken, {
        ...form,
        costoDelivery: form.costoDelivery,
      } as never);
      setForm(desdeLaApi(guardado));
      setAviso("Guardado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!accessToken) return;
    setGuardando(true);
    setError(null);
    try {
      setForm(desdeLaApi(await borrarConfiguracion(accessToken)));
      setAviso("Se borraron los datos de cobro. La tienda no puede recibir pedidos.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo borrar");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  const sinCobro = !form.yape.trim() && !form.cuenta.trim() && !form.cci.trim();
  const sinEntrega = !form.recojoActivo && !form.deliveryActivo;

  return (
    <form onSubmit={guardar} className="flex flex-col gap-7">
      <header>
        <h1 className="font-serif text-2xl text-foreground">Pagos y entregas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Son los datos de la tienda, no los de cada administrador. Cualquiera de ustedes puede
          cambiarlos y quien compra los ve al pagar.
        </p>
      </header>

      {/* Sin esto la tienda no puede cobrar: conviene que se vea antes de
          que alguien descubra que el checkout esta bloqueado. */}
      {sinCobro || sinEntrega ? (
        <p className="flex items-start gap-2 border border-primary/50 bg-primary/5 p-4 text-sm text-foreground">
          <Icon icon="mdi:alert-outline" className="mt-0.5 h-4 w-4 flex-none text-primary" />
          {sinCobro
            ? "Sin Yape ni cuenta bancaria nadie puede comprar: el checkout queda bloqueado."
            : "Con las dos entregas apagadas nadie puede comprar."}
        </p>
      ) : null}

      <section className="surface flex flex-col gap-4 p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-primary">A nombre de quién</h2>
        <Input
          aria-label="Titular"
          placeholder="Nombre del titular"
          value={form.titular}
          onChange={(e) => cambiar("titular", e.target.value)}
        />
      </section>

      <section className="surface flex flex-col gap-4 p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-primary">Yape</h2>
        <Input
          aria-label="Número de Yape"
          placeholder="9XX XXX XXX"
          value={form.yape}
          onChange={(e) => cambiar("yape", e.target.value)}
        />
      </section>

      <section className="surface grid gap-4 p-5 sm:grid-cols-3">
        <h2 className="col-span-full text-xs uppercase tracking-[0.2em] text-primary">
          Transferencia
        </h2>
        <Input
          aria-label="Banco"
          placeholder="Banco"
          value={form.banco}
          onChange={(e) => cambiar("banco", e.target.value)}
        />
        <Input
          aria-label="Número de cuenta"
          placeholder="Número de cuenta"
          value={form.cuenta}
          onChange={(e) => cambiar("cuenta", e.target.value)}
        />
        <Input
          aria-label="CCI"
          placeholder="CCI"
          value={form.cci}
          onChange={(e) => cambiar("cci", e.target.value)}
        />
      </section>

      <section className="surface flex flex-col gap-4 p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-primary">Entregas</h2>

        <label className="flex items-center gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.recojoActivo}
            onChange={(e) => cambiar("recojoActivo", e.target.checked)}
          />
          Recojo en tienda
        </label>

        <label className="flex items-center gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.deliveryActivo}
            onChange={(e) => cambiar("deliveryActivo", e.target.checked)}
          />
          Delivery
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Costo del delivery
          </span>
          <Input
            type="number"
            min="0"
            step="0.5"
            aria-label="Costo del delivery"
            value={form.costoDelivery}
            onChange={(e) => cambiar("costoDelivery", e.target.value)}
            disabled={!form.deliveryActivo}
          />
          <small className="text-xs text-muted-foreground">
            En 0 el delivery es gratis. Es un monto fijo para todos los pedidos.
          </small>
        </label>
      </section>

      <section className="surface flex flex-col gap-4 p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-primary">Avisos</h2>
        <Input
          type="email"
          aria-label="Correo para los avisos"
          placeholder="correo@tienda.com"
          value={form.correoDeAvisos}
          onChange={(e) => cambiar("correoDeAvisos", e.target.value)}
        />
        <small className="text-xs text-muted-foreground">
          A esta casilla llega cada pedido nuevo, con el comprobante adjunto.
        </small>
      </section>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {aviso ? <p className="text-sm text-primary">{aviso}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
        <Button type="button" variant="ghost" disabled={guardando} onClick={borrar}>
          Borrar los datos de cobro
        </Button>
      </div>
    </form>
  );
}
