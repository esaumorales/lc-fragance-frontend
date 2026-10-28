"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { getCart } from "@/lib/cart-api";
import { leerCarrito, paraElPedido, vaciar, type ItemLocal } from "@/lib/carrito-local";
import { useCarritoLocal } from "@/lib/use-carrito-local";
import { hacerPedido, obtenerDatosDeCobro } from "@/lib/pago-api";
import { subirVoucher } from "@/lib/voucher-api";
import { oferta } from "@/lib/oferta";
import { precio } from "@/lib/precio";
import { cn } from "@/lib/cn";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";
import { CampoParaCopiar } from "@/components/molecules/CampoParaCopiar";
import type {
  CartItem,
  CheckoutResult,
  DatosDeCobro,
  MetodoDePago,
  TipoDeEntrega,
} from "@/lib/types";

type Renglon = { productId: string; name: string; precio: number; quantity: number };

function deLocal(item: ItemLocal): Renglon {
  return {
    productId: item.productId,
    name: item.name,
    precio: Number(item.offerPrice ?? item.price),
    quantity: item.quantity,
  };
}

function deCarrito(item: CartItem): Renglon {
  return {
    productId: item.productId,
    name: item.product.name,
    precio: Number(oferta(item.product).precio),
    quantity: item.quantity,
  };
}

const NOMBRE_DEL_METODO: Record<MetodoDePago, string> = {
  YAPE: "Yape",
  TRANSFERENCIA: "Transferencia",
};

const NOMBRE_DE_LA_ENTREGA: Record<TipoDeEntrega, string> = {
  RECOJO: "Recojo en tienda",
  DELIVERY: "Delivery",
};

export function CheckoutView() {
  const { user, accessToken, loading: authLoading } = useAuth();
  const { refresh: refrescarContador } = useCart();
  const router = useRouter();

  const [cobro, setCobro] = useState<DatosDeCobro | null>(null);
  const [delServidor, setDelServidor] = useState<Renglon[]>([]);
  const [cargado, setCargado] = useState(false);

  const [nombreElegido, setNombre] = useState<string | null>(null);
  const [correoElegido, setCorreo] = useState<string | null>(null);
  const [celular, setCelular] = useState("");
  const [metodoElegido, setMetodo] = useState<MetodoDePago | null>(null);
  const [entregaElegida, setEntrega] = useState<TipoDeEntrega | null>(null);
  const [direccion, setDireccion] = useState("");
  const [nota, setNota] = useState("");
  const [masOpciones, setMasOpciones] = useState(false);

  const [voucherUrl, setVoucherUrl] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<CheckoutResult | null>(null);

  const local = useCarritoLocal();

  useEffect(() => {
    let vivo = true;
    obtenerDatosDeCobro()
      .then((datos) => {
        if (vivo) setCobro(datos);
      })
      .catch(() => {
        if (vivo) setError("No se pudieron cargar los medios de pago");
      })
      .finally(() => {
        if (vivo) setCargado(true);
      });

    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    let vivo = true;
    getCart(accessToken)
      .then((cart) => {
        if (vivo) setDelServidor(cart.items.map(deCarrito));
      })
      .catch(() => {
        if (vivo) setError("No se pudo cargar el carrito");
      });

    return () => {
      vivo = false;
    };
  }, [accessToken]);

  const renglones = accessToken ? delServidor : local.map(deLocal);

  // Lo elegido manda; mientras no toquen nada, se muestra lo de la cuenta y
  // lo primero que la tienda tiene habilitado. Asi no hace falta copiarlo
  // con un efecto en cuanto llegan los datos.
  const nombre = nombreElegido ?? user?.name ?? "";
  const correo = correoElegido ?? user?.email ?? "";
  const metodo = metodoElegido ?? cobro?.metodos[0] ?? null;
  const entrega = entregaElegida ?? cobro?.entregas[0] ?? null;

  async function elegirVoucher(archivo: File | null) {
    if (!archivo) return;
    setError(null);
    setSubiendo(true);
    try {
      setVoucherUrl(await subirVoucher(archivo));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el comprobante");
    } finally {
      setSubiendo(false);
    }
  }

  async function confirmar(evento: FormEvent) {
    evento.preventDefault();
    if (!metodo || !entrega) return;

    setEnviando(true);
    setError(null);
    try {
      const respuesta = await hacerPedido(
        {
          nombre: nombre.trim(),
          correo: correo.trim(),
          celular: celular.trim(),
          metodoPago: metodo,
          voucherUrl,
          entrega,
          direccion: entrega === "DELIVERY" ? direccion.trim() : null,
          nota: nota.trim() || null,
          ...(accessToken ? {} : { items: paraElPedido(leerCarrito()) }),
        },
        accessToken
      );

      if (!accessToken) vaciar();
      refrescarContador();
      setResultado(respuesta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo hacer el pedido");
    } finally {
      setEnviando(false);
    }
  }

  if (authLoading || !cargado) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (resultado) {
    return <PedidoHecho resultado={resultado} />;
  }

  if (cobro?.motivo) {
    return (
      <div className="surface flex flex-col items-start gap-3 p-6">
        <Icon icon="mdi:information-outline" className="h-6 w-6 text-primary" />
        <p className="text-foreground">{cobro.motivo}</p>
      </div>
    );
  }

  if (renglones.length === 0) {
    return (
      <div className="cart-empty">
        <Icon icon="mdi:shopping-outline" />
        <p>No hay nada para pagar.</p>
        <Link href="/perfumes" className="mt-3 text-primary">
          Ver la colección ↗
        </Link>
      </div>
    );
  }

  const subtotal = renglones.reduce((suma, r) => suma + r.precio * r.quantity, 0);
  const envio = entrega === "DELIVERY" ? Number(cobro?.costoDelivery ?? 0) : 0;
  const total = subtotal + envio;

  return (
    <form onSubmit={confirmar} className="checkout-layout">
      <div className="flex flex-col gap-8">
        <section className="checkout-bloque">
          <h2 className="checkout-titulo">Tus datos</h2>
          <label className="checkout-campo">
            <span>Nombre y apellidos</span>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre y apellidos"
              required
              minLength={2}
            />
          </label>
          <label className="checkout-campo">
            <span>Número de celular</span>
            <Input
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              placeholder="9XX XXX XXX"
              inputMode="tel"
              required
            />
          </label>
          <label className="checkout-campo">
            <span>Correo</span>
            <Input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="nombre@correo.com"
              required
            />
            <small>A este correo te llega la confirmación de tu pedido.</small>
          </label>
        </section>

        <section className="checkout-bloque">
          <h2 className="checkout-titulo">Pago</h2>

          <div className="checkout-pestanas">
            {cobro?.metodos.map((cual) => (
              <button
                key={cual}
                type="button"
                onClick={() => setMetodo(cual)}
                aria-pressed={metodo === cual}
                className={cn("checkout-pestana", metodo === cual && "checkout-pestana--activa")}
              >
                {NOMBRE_DEL_METODO[cual]}
              </button>
            ))}
          </div>

          <div className="checkout-datos">
            {metodo === "YAPE" ? (
              <>
                <CampoParaCopiar etiqueta="Yape" valor={cobro?.yape ?? ""} />
                <CampoParaCopiar etiqueta="Titular" valor={cobro?.titular ?? ""} copiable={false} />
              </>
            ) : (
              <>
                <CampoParaCopiar etiqueta="Banco" valor={cobro?.banco ?? ""} copiable={false} />
                <CampoParaCopiar etiqueta="Cuenta" valor={cobro?.cuenta ?? ""} />
                <CampoParaCopiar etiqueta="CCI" valor={cobro?.cci ?? ""} />
                <CampoParaCopiar etiqueta="Titular" valor={cobro?.titular ?? ""} copiable={false} />
              </>
            )}
          </div>

          <p className="checkout-monto">
            Monto a pagar: <strong>{precio(total)}</strong>
          </p>

          <label className={cn("checkout-voucher", voucherUrl && "checkout-voucher--listo")}>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => elegirVoucher(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
            <Icon icon={voucherUrl ? "mdi:check-circle-outline" : "mdi:tray-arrow-up"} />
            <span className="font-serif text-xl">
              {subiendo ? "Subiendo…" : voucherUrl ? "Comprobante adjunto" : "Adjunta tu voucher"}
            </span>
            <small>Captura del Yape o de la transferencia (foto o PDF)</small>
          </label>
        </section>

        <section className="checkout-bloque">
          <button
            type="button"
            onClick={() => setMasOpciones((abierto) => !abierto)}
            aria-expanded={masOpciones}
            className="checkout-mas"
          >
            <Icon icon={masOpciones ? "mdi:menu-down" : "mdi:menu-right"} />
            <span className="font-serif text-xl">Más opciones</span>
            <small>delivery o una nota</small>
          </button>

          {masOpciones ? (
            <div className="mt-4 flex flex-col gap-4">
              <div className="checkout-pestanas">
                {cobro?.entregas.map((cual) => (
                  <button
                    key={cual}
                    type="button"
                    onClick={() => setEntrega(cual)}
                    aria-pressed={entrega === cual}
                    className={cn(
                      "checkout-pestana",
                      entrega === cual && "checkout-pestana--activa"
                    )}
                  >
                    {NOMBRE_DE_LA_ENTREGA[cual]}
                  </button>
                ))}
              </div>

              {entrega === "DELIVERY" ? (
                <label className="checkout-campo">
                  <span>Dirección de entrega</span>
                  <Input
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Calle, número, distrito y una referencia"
                    required
                  />
                </label>
              ) : null}

              <label className="checkout-campo">
                <span>Nota para la tienda</span>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="checkout-nota"
                />
              </label>
            </div>
          ) : null}
        </section>
      </div>

      <aside className="checkout-resumen">
        <h2 className="checkout-titulo">Tu pedido</h2>
        <ul className="flex flex-col gap-3">
          {renglones.map((renglon) => (
            <li key={renglon.productId} className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">
                {renglon.name}
                {renglon.quantity > 1 ? ` x${renglon.quantity}` : ""}
              </span>
              <span className="text-foreground">{precio(renglon.precio * renglon.quantity)}</span>
            </li>
          ))}
        </ul>

        {envio > 0 ? (
          <p className="flex justify-between text-sm">
            <span className="text-muted-foreground">Envío</span>
            <span className="text-foreground">{precio(envio)}</span>
          </p>
        ) : null}

        <p className="checkout-total">
          <span>Total</span>
          <span>{precio(total)}</span>
        </p>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <Button type="submit" variant="primary" disabled={enviando || subiendo} className="w-full">
          {enviando ? "Enviando…" : "Hacer el pedido"}
        </Button>

        <button type="button" onClick={() => router.push("/carrito")} className="checkout-volver">
          Volver al carrito
        </button>
      </aside>
    </form>
  );
}

function PedidoHecho({ resultado }: { resultado: CheckoutResult }) {
  return (
    <div className="surface flex flex-col gap-5 p-6">
      <p className="flex items-center gap-2 text-foreground">
        <Icon icon="mdi:check-circle" className="text-primary" />
        Pedido #{resultado.order.id.slice(0, 8)} registrado — {precio(resultado.order.total)}
      </p>

      <p className="text-sm text-muted-foreground">
        Te mandamos el detalle a <span className="text-foreground">{resultado.order.correo}</span>.
        Revisamos el pago y te confirmamos por ahí mismo, con el plazo de entrega.
      </p>

      {resultado.whatsappUrl ? (
        <a
          href={resultado.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit"
        >
          <Button variant="secondary" className="gap-2">
            <Icon icon="mdi:whatsapp" />
            ¿Dudas? Escribinos
          </Button>
        </a>
      ) : null}

      <Link href="/perfumes" className="text-sm text-primary">
        Seguir viendo la colección ↗
      </Link>
    </div>
  );
}
