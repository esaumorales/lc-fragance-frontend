"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AuthUser, DesafioSegundoFactor } from "@/lib/types";
import {
  loginRequest,
  logoutRequest,
  registerRequest,
  verificarCodigoRequest,
} from "@/lib/auth-api";
import { bindSessionListener, refreshSession, setSessionToken } from "@/lib/session";

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  // Devuelve el desafío si la cuenta es del panel, o null si ya quedó dentro.
  login: (email: string, password: string) => Promise<DesafioSegundoFactor | null>;
  completarCodigo: (desafioId: string, codigo: string) => Promise<void>;
  // Tras editar el perfil hay que reflejar los datos nuevos en toda la app.
  actualizarUsuario: (usuario: AuthUser) => void;
  // Cambiar la contraseña invalida la sesión vieja y devuelve una nueva.
  reemplazarSesion: (res: { accessToken: string; user: AuthUser }) => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshedOnce = useRef(false);

  // Las renovaciones automaticas ocurren fuera de React (cuando una peticion
  // recibe 401), asi que el provider tiene que enterarse para no quedarse con
  // un token viejo en estado.
  useEffect(() => bindSessionListener((token, nextUser) => {
    setAccessToken(token);
    setUser(nextUser);
  }), []);

  useEffect(() => {
    // Guard contra el doble efecto de React StrictMode en desarrollo: sin
    // esto se disparan dos refresh casi simultáneos con el mismo token.
    if (refreshedOnce.current) return;
    refreshedOnce.current = true;

    // Al cargar la app, intenta restaurar la sesión con el refresh token
    // (cookie httpOnly) sin pedirle credenciales de nuevo al usuario.
    refreshSession().finally(() => setLoading(false));
  }, []);

  function abrirSesion(res: { accessToken: string; user: AuthUser }) {
    setSessionToken(res.accessToken);
    setAccessToken(res.accessToken);
    setUser(res.user);
  }

  async function login(email: string, password: string) {
    const res = await loginRequest(email, password);
    if ("requiereCodigo" in res) {
      return res;
    }
    abrirSesion(res);
    return null;
  }

  function actualizarUsuario(usuario: AuthUser) {
    setUser(usuario);
  }

  async function completarCodigo(desafioId: string, codigo: string) {
    abrirSesion(await verificarCodigoRequest(desafioId, codigo));
  }

  async function register(name: string, email: string, password: string) {
    abrirSesion(await registerRequest(name, email, password));
  }

  async function logout() {
    await logoutRequest().catch(() => {});
    setSessionToken(null);
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{
        user,
        accessToken,
        loading,
        login,
        completarCodigo,
        actualizarUsuario,
        reemplazarSesion: abrirSesion,
        register,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
