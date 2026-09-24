import type { AuthResponse, AuthUser, ResultadoDeLogin } from "@/lib/types";
import { API_BASE } from "@/lib/api-base";

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function registerRequest(name: string, email: string, password: string) {
  return authFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

// Devuelve la sesión si es un cliente, o el desafío si es una cuenta del panel.
export function loginRequest(email: string, password: string) {
  return authFetch<ResultadoDeLogin>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function verificarCodigoRequest(desafioId: string, codigo: string) {
  return authFetch<AuthResponse>("/api/auth/codigo", {
    method: "POST",
    body: JSON.stringify({ desafioId, codigo }),
  });
}

export function olvideRequest(email: string) {
  return authFetch<{ mensaje: string }>("/api/auth/olvide", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function restablecerRequest(token: string, password: string) {
  return authFetch<{ mensaje: string }>("/api/auth/restablecer", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export function refreshRequest() {
  return authFetch<AuthResponse>("/api/auth/refresh", { method: "POST" });
}

export function logoutRequest() {
  return authFetch<void>("/api/auth/logout", { method: "POST" });
}

export function actualizarPerfilRequest(
  accessToken: string,
  datos: { name?: string; email?: string; password?: string }
) {
  return authFetch<{ user: AuthUser }>("/api/auth/me", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(datos),
  });
}

export function cambiarClaveRequest(accessToken: string, actual: string, nueva: string) {
  return authFetch<AuthResponse>("/api/auth/password", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ actual, nueva }),
  });
}

export function meRequest(accessToken: string) {
  return authFetch<{ user: AuthUser }>("/api/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
