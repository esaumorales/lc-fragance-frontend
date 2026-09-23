import { getSessionToken, refreshSession } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

/**
 * Peticion autenticada con renovacion automatica.
 *
 * Si el backend responde 401 porque vencio el token de acceso, renueva una vez
 * y reintenta. El `token` que llega por parametro es solo el primer intento:
 * cuando esta vencido, el que vale es el que devuelve la renovacion.
 *
 * Se reintenta una sola vez a proposito: si el segundo intento tambien da 401,
 * la sesion realmente termino y hay que volver a iniciarla.
 */
export async function authorizedFetch<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const send = (bearer: string) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
        ...init?.headers,
      },
    });

  let res = await send(getSessionToken() ?? token);

  if (res.status === 401) {
    const renewed = await refreshSession();
    if (renewed) {
      res = await send(renewed);
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      body.error ?? (res.status === 401 ? "Tu sesión expiró, iniciá sesión de nuevo" : `Error ${res.status}`)
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
