import type { Administrador } from "@/lib/types";
import { authorizedFetch } from "@/lib/authorized-fetch";

// Cuando el correo no salio, el backend devuelve el enlace para pasarlo a mano.
export type AltaDeAdmin = {
  admin: Administrador;
  correoEnviado: boolean;
  enlace?: string;
};

export type AccesoReenviado = {
  correoEnviado: boolean;
  enlace?: string;
};

export function listarAdmins(token: string) {
  return authorizedFetch<Administrador[]>(token, "/api/admin/usuarios");
}

export function crearAdmin(
  token: string,
  data: { name: string; email: string; role: "ADMIN" | "SUPERADMIN" }
) {
  return authorizedFetch<AltaDeAdmin>(token, "/api/admin/usuarios", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function actualizarAdmin(
  token: string,
  id: string,
  cambios: { name?: string; role?: "ADMIN" | "SUPERADMIN"; isActive?: boolean }
) {
  return authorizedFetch<Administrador>(token, `/api/admin/usuarios/${id}`, {
    method: "PATCH",
    body: JSON.stringify(cambios),
  });
}

export function eliminarAdmin(token: string, id: string) {
  return authorizedFetch<void>(token, `/api/admin/usuarios/${id}`, { method: "DELETE" });
}

export function reenviarAcceso(token: string, id: string) {
  return authorizedFetch<AccesoReenviado>(token, `/api/admin/usuarios/${id}/acceso`, {
    method: "POST",
  });
}
