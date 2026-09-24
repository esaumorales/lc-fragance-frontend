"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { puedeEntrarAlPanel } from "@/lib/roles";

const ENLACE = "text-sm text-muted-foreground hover:text-foreground";

// La columna "Cuenta" del pie. Es aparte del footer para que el resto siga
// siendo servidor: solo esto necesita saber si hay sesión.
export function FooterCuenta() {
  const { user, loading, logout } = useAuth();

  // Mientras se restaura la sesión no se muestra nada: ofrecer "Iniciar
  // sesión" a alguien que ya entró es peor que esperar un instante.
  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <>
        <Link href="/login" className={ENLACE}>
          Iniciar sesión
        </Link>
        <Link href="/registro" className={ENLACE}>
          Crear cuenta
        </Link>
      </>
    );
  }

  return (
    <>
      <span className="truncate text-sm text-foreground">{user.name}</span>
      {puedeEntrarAlPanel(user.role) && (
        <Link href="/admin" className={ENLACE}>
          Panel de administración
        </Link>
      )}
      <Link href="/carrito" className={ENLACE}>
        Mi carrito
      </Link>
      <button type="button" onClick={() => logout()} className={`${ENLACE} text-left`}>
        Cerrar sesión
      </button>
    </>
  );
}
