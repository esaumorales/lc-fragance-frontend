import type { RolDeUsuario } from "@/lib/types";
import { esSuperadmin } from "@/lib/roles";

// Que pestañas y que conteos tiene sentido mostrarle a cada rol.
// El recorte de verdad lo hace el backend; esto es para no ofrecer filtros
// que devolverian vacio ni tarjetas que siempre dirian cero.

export type FiltroDeUsuarios = RolDeUsuario | "TODOS";

const ETIQUETAS: Record<FiltroDeUsuarios, string> = {
  TODOS: "Todos",
  CUSTOMER: "Clientes",
  ADMIN: "Administradores",
  SUPERADMIN: "Superadmin",
};

export function filtrosPara(rol: RolDeUsuario | undefined): { id: FiltroDeUsuarios; label: string }[] {
  // Un administrador solo ve administradores: una sola pestaña no es una
  // eleccion, asi que no se muestra ninguna.
  const ids: FiltroDeUsuarios[] = esSuperadmin(rol)
    ? ["TODOS", "CUSTOMER", "ADMIN", "SUPERADMIN"]
    : [];
  return ids.map((id) => ({ id, label: ETIQUETAS[id] }));
}

export function tarjetasPara(rol: RolDeUsuario | undefined): ("TOTAL" | RolDeUsuario)[] {
  return esSuperadmin(rol) ? ["TOTAL", "CUSTOMER", "ADMIN", "SUPERADMIN"] : ["ADMIN"];
}
