import type { Direccion, RolDeUsuario } from "@/lib/types";
import { authorizedFetch } from "@/lib/authorized-fetch";

// No extiende Administrador: ese fija el rol a los del panel, y aca tambien
// entran los clientes.
export type UsuarioDelPanel = {
  id: string;
  name: string;
  email: string;
  role: RolDeUsuario;
  isActive: boolean;
  createdAt: string;
  address: Direccion | null;
};

export type ListadoDeUsuarios = {
  total: number;
  porRol: Record<RolDeUsuario, number>;
  usuarios: UsuarioDelPanel[];
};

// Cuando el correo no salio, el backend devuelve el enlace para pasarlo a mano.
export type AltaDeAdmin = {
  admin: UsuarioDelPanel;
  correoEnviado: boolean;
  enlace?: string;
};

export type AccesoReenviado = {
  correoEnviado: boolean;
  enlace?: string;
};

export type Confirmacion = {
  confirmacionId: string;
  codigo: string;
};

// El codigo viaja en cabeceras para que funcione igual en DELETE, donde el
// cuerpo puede perderse al pasar por un proxy.
function cabeceras(confirmacion: Confirmacion) {
  return {
    "x-confirmacion-id": confirmacion.confirmacionId,
    "x-confirmacion-codigo": confirmacion.codigo,
  };
}

export function listarUsuarios(token: string, rol?: RolDeUsuario) {
  const query = rol ? `?rol=${rol}` : "";
  return authorizedFetch<ListadoDeUsuarios>(token, `/api/admin/usuarios${query}`);
}

/** Pide el codigo que despues hay que mandar con la accion. */
export function pedirConfirmacion(token: string) {
  return authorizedFetch<{ confirmacionId: string; correoEnviado: boolean }>(
    token,
    "/api/admin/confirmacion",
    { method: "POST" }
  );
}

export function crearAdmin(
  token: string,
  data: { name: string; email: string; role: "ADMIN" | "SUPERADMIN" },
  confirmacion: Confirmacion
) {
  return authorizedFetch<AltaDeAdmin>(token, "/api/admin/usuarios", {
    method: "POST",
    headers: cabeceras(confirmacion),
    body: JSON.stringify(data),
  });
}

export function actualizarUsuario(
  token: string,
  id: string,
  cambios: { name?: string; email?: string; role?: "ADMIN" | "SUPERADMIN"; isActive?: boolean },
  confirmacion: Confirmacion
) {
  return authorizedFetch<UsuarioDelPanel>(token, `/api/admin/usuarios/${id}`, {
    method: "PATCH",
    headers: cabeceras(confirmacion),
    body: JSON.stringify(cambios),
  });
}

export function eliminarUsuario(token: string, id: string, confirmacion: Confirmacion) {
  return authorizedFetch<void>(token, `/api/admin/usuarios/${id}`, {
    method: "DELETE",
    headers: cabeceras(confirmacion),
  });
}

// Reenviar el acceso no cambia nada de la cuenta: no pide confirmacion.
export function reenviarAcceso(token: string, id: string) {
  return authorizedFetch<AccesoReenviado>(token, `/api/admin/usuarios/${id}/acceso`, {
    method: "POST",
  });
}
