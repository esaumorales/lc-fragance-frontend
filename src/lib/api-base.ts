// Origen del backend, tal cual: se usa desde el servidor y para el socket.
const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

/**
 * Base para las llamadas a la API.
 *
 * En el navegador queda vacía a propósito: las peticiones van al mismo origen
 * y Next las reenvía al backend (ver rewrites en next.config.ts). Eso hace que
 * la cookie de sesión sea de primera parte; cuando iba directo al dominio del
 * backend era de tercera parte y el navegador la descartaba al navegar, así que
 * cualquier recarga cerraba la sesión.
 *
 * En el servidor no hay origen al que apuntar, así que va directo al backend.
 */
export const API_BASE = typeof window === "undefined" ? BACKEND : "";

// El socket no pasa por el reenvío: Vercel no reenvía WebSocket a otro dominio.
export const SOCKET_URL = BACKEND;
