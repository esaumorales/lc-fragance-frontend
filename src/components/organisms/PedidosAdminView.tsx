"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { avanzarPedido, cancelarPedido, confirmarPedido, listarPedidos } from "@/lib/pedidos-api";
import { cn } from "@/lib/cn";
import type { EstadoPedido, Pedido } from "@/lib/types";
import { Icon } from "@/components/atoms/Icon";
import { precio } from "@/lib/precio";

const ESTADOS: { id: EstadoPedido | "TODOS"; label: string }[] = [
  { id: "PENDING", label: "Por confirmar" },
  { id: "PAID", label: "Confirmados" },
  { id: "SHIPPED", label: "Enviados" },
  { id: "DELIVERED", label: "Entregados" },
  { id: "CANCELLED", label: "Cancelados" },
  { id: "TODOS", label: "Todos" },
];

const NOMBRE: Record<EstadoPedido, string> = {
  PENDING: "Por confirmar",
  PAID: "Confirmado",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

function fecha(iso: string) {
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PedidosAdminView() {
  const { accessToken } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtro, setFiltro] = useState<EstadoPedido | "TODOS">("PENDING");
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(() => {
    if (!accessToken) return;
    // El indicador lo prende quien cambia el filtro: prenderlo aca seria un
    // setState sincrono dentro del efecto.
    listarPedidos(accessToken, filtro === "TODOS" ? undefined : filtro)
      .then(setPedidos)
      .catch(() => setError("No se pudieron cargar los pedidos"))
      .finally(() => setCargando(false));
  }, [accessToken, filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function ejecutar(id: string, accion: () => Promise<unknown>, mensaje: string) {
    if (!accessToken || trabajando) return;
    setTrabajando(id);
    setError(null);
    setAviso(null);
    try {
      await accion();
      setAviso(mensaje);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción");
    } finally {
      setTrabajando(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl tracking-wide text-foreground">Pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El stock se descuenta recién cuando confirmás. Hasta entonces, el pedido no le quita
          unidades a nadie.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ESTADOS.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => {
              setFiltro(e.id);
              setCargando(true);
            }}
            aria-pressed={filtro === e.id}
            className={cn(
              "border px-3 py-2 text-xs uppercase tracking-[0.1em] transition-colors",
              filtro === e.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/60 hover:text-primary"
            )}
          >
            {e.label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}
      {aviso ? (
        <p className="flex items-center gap-2 text-sm text-primary">
          <Icon icon="mdi:check-circle-outline" className="h-4 w-4" />
          {aviso}
        </p>
      ) : null}

      {cargando ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon icon="mdi:loading" className="h-4 w-4 animate-spin text-primary" />
          Cargando…
        </p>
      ) : pedidos.length === 0 ? (
        <p className="surface px-4 py-3 text-sm text-muted-foreground">
          No hay pedidos en este estado.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pedidos.map((pedido) => (
            <li key={pedido.id} className="surface flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">
                    #{pedido.id.slice(0, 8)} · {pedido.user.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {pedido.user.email} · {fecha(pedido.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-xl text-foreground">{precio(pedido.total)}</p>
                  <p
                    className={cn(
                      "text-xs uppercase tracking-[0.1em]",
                      pedido.status === "PENDING" ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {NOMBRE[pedido.status]}
                  </p>
                </div>
              </div>

              <ul className="flex flex-col gap-1 border-t border-hairline pt-3">
                {pedido.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3 text-xs">
                    <span className="truncate text-foreground">
                      {item.quantity}× {item.product.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {precio(item.unitPrice)} c/u · quedan {item.product.stock}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2">
                {pedido.status === "PENDING" ? (
                  <button
                    type="button"
                    disabled={trabajando === pedido.id}
                    onClick={() =>
                      ejecutar(
                        pedido.id,
                        () => confirmarPedido(accessToken!, pedido.id),
                        `Pedido #${pedido.id.slice(0, 8)} confirmado, el stock ya se descontó.`
                      )
                    }
                    className="border border-primary bg-primary/10 px-3 py-2 text-xs uppercase tracking-[0.1em] text-primary"
                  >
                    {trabajando === pedido.id ? "Confirmando…" : "Confirmar compra"}
                  </button>
                ) : null}

                {pedido.status === "PAID" ? (
                  <button
                    type="button"
                    disabled={trabajando === pedido.id}
                    onClick={() =>
                      ejecutar(
                        pedido.id,
                        () => avanzarPedido(accessToken!, pedido.id, "SHIPPED"),
                        "Marcado como enviado."
                      )
                    }
                    className="border border-border px-3 py-2 text-xs uppercase tracking-[0.1em] text-muted-foreground hover:border-primary/60 hover:text-primary"
                  >
                    Marcar enviado
                  </button>
                ) : null}

                {pedido.status === "SHIPPED" ? (
                  <button
                    type="button"
                    disabled={trabajando === pedido.id}
                    onClick={() =>
                      ejecutar(
                        pedido.id,
                        () => avanzarPedido(accessToken!, pedido.id, "DELIVERED"),
                        "Marcado como entregado."
                      )
                    }
                    className="border border-border px-3 py-2 text-xs uppercase tracking-[0.1em] text-muted-foreground hover:border-primary/60 hover:text-primary"
                  >
                    Marcar entregado
                  </button>
                ) : null}

                {pedido.status !== "CANCELLED" ? (
                  <button
                    type="button"
                    disabled={trabajando === pedido.id}
                    onClick={() =>
                      ejecutar(
                        pedido.id,
                        () => cancelarPedido(accessToken!, pedido.id),
                        pedido.status === "PENDING"
                          ? "Pedido cancelado."
                          : "Pedido cancelado, el stock volvió al inventario."
                      )
                    }
                    className="border border-red-400/40 px-3 py-2 text-xs uppercase tracking-[0.1em] text-red-400 hover:bg-red-400/10"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
