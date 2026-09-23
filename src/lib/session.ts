import type { AuthUser } from "@/lib/types";
import { refreshRequest } from "@/lib/auth-api";

/**
 * Sesion viva, fuera de React.
 *
 * El token de acceso dura 15 minutos. Antes, si vencia mientras la pestaña
 * estaba abierta, todas las llamadas autenticadas empezaban a fallar con 401
 * en silencio: el carrito dejaba de funcionar sin ningun aviso. Aca vive el
 * token actual para que cualquier peticion pueda renovarlo y reintentar sin
 * pasar por el arbol de componentes.
 */

let currentToken: string | null = null;
let inFlightRefresh: Promise<string | null> | null = null;

type SessionListener = (token: string | null, user: AuthUser | null) => void;
let notify: SessionListener = () => {};

export function setSessionToken(token: string | null) {
  currentToken = token;
}

export function getSessionToken() {
  return currentToken;
}

/** Deja que el AuthProvider se entere de las renovaciones automaticas. */
export function bindSessionListener(listener: SessionListener) {
  notify = listener;
  return () => {
    notify = () => {};
  };
}

/**
 * Renueva el token con la cookie httpOnly. Las llamadas concurrentes comparten
 * una sola peticion: sin esto, varias peticiones venciendo a la vez dispararian
 * varios /refresh simultaneos y la rotacion de tokens del backend rechazaria
 * todos menos uno.
 */
export function refreshSession(): Promise<string | null> {
  if (!inFlightRefresh) {
    inFlightRefresh = refreshRequest()
      .then((res) => {
        currentToken = res.accessToken;
        notify(res.accessToken, res.user);
        return res.accessToken;
      })
      .catch(() => {
        currentToken = null;
        notify(null, null);
        return null;
      })
      .finally(() => {
        inFlightRefresh = null;
      });
  }
  return inFlightRefresh;
}
