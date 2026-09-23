import type { AuthUser } from "@/lib/types";

type Rol = AuthUser["role"] | undefined;

// Los dos roles que entran al panel. Se centraliza para que agregar uno no
// obligue a recordar cada lugar donde se compara contra "ADMIN".
export function puedeEntrarAlPanel(rol: Rol): boolean {
  return rol === "ADMIN" || rol === "SUPERADMIN";
}

// Solo el dueño gestiona administradores.
export function esSuperadmin(rol: Rol): boolean {
  return rol === "SUPERADMIN";
}
