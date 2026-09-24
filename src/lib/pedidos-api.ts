import type { EstadoPedido, Pedido } from "@/lib/types";
import { authorizedFetch } from "@/lib/authorized-fetch";

export function listarPedidos(token: string, status?: EstadoPedido) {
  const query = status ? `?status=${status}` : "";
  return authorizedFetch<Pedido[]>(token, `/api/admin/pedidos${query}`);
}

// Confirmar es lo que descuenta el stock: hasta acá el pedido no tocó nada.
export function confirmarPedido(token: string, id: string) {
  return authorizedFetch<Pedido>(token, `/api/admin/pedidos/${id}/confirmar`, { method: "POST" });
}

export function cancelarPedido(token: string, id: string) {
  return authorizedFetch<Pedido>(token, `/api/admin/pedidos/${id}/cancelar`, { method: "POST" });
}

export function avanzarPedido(token: string, id: string, status: "SHIPPED" | "DELIVERED") {
  return authorizedFetch<Pedido>(token, `/api/admin/pedidos/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
