import { apiFetch } from "@/lib/api";
import { authorizedFetch } from "@/lib/authorized-fetch";
import type { CheckoutResult, ConfiguracionDePago, DatosDeCobro } from "@/lib/types";

/** Lo que necesita el checkout. Abierto: tambien compra quien no tiene cuenta. */
export function obtenerDatosDeCobro() {
  return apiFetch<DatosDeCobro>("/api/pago");
}

export type PedidoNuevo = {
  nombre: string;
  correo: string;
  celular: string;
  metodoPago: "YAPE" | "TRANSFERENCIA";
  voucherUrl?: string | null;
  entrega: "RECOJO" | "DELIVERY";
  direccion?: string | null;
  nota?: string | null;
  /** Solo para quien compra sin cuenta: su carrito vive en el navegador. */
  items?: { productId: string; quantity: number }[];
};

/**
 * Hace el pedido.
 *
 * Con token el pedido queda atado a la cuenta y se vacia el carrito guardado;
 * sin token, los productos viajan en `items`.
 */
export function hacerPedido(pedido: PedidoNuevo, token?: string | null) {
  if (!token) {
    return apiFetch<CheckoutResult>("/api/checkout", {
      method: "POST",
      body: JSON.stringify(pedido),
    });
  }

  return authorizedFetch<CheckoutResult>(token, "/api/checkout", {
    method: "POST",
    body: JSON.stringify(pedido),
  });
}

// --- Panel ---------------------------------------------------------------

export function obtenerConfiguracion(token: string) {
  return authorizedFetch<ConfiguracionDePago>(token, "/api/admin/pago");
}

export function guardarConfiguracion(token: string, cambios: Partial<ConfiguracionDePago>) {
  return authorizedFetch<ConfiguracionDePago>(token, "/api/admin/pago", {
    method: "PUT",
    body: JSON.stringify(cambios),
  });
}

export function borrarConfiguracion(token: string) {
  return authorizedFetch<ConfiguracionDePago>(token, "/api/admin/pago", { method: "DELETE" });
}
