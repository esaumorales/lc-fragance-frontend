"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { actualizarPerfilRequest, cambiarClaveRequest } from "@/lib/auth-api";
import { puedeEntrarAlPanel } from "@/lib/roles";
import type { AuthUser } from "@/lib/types";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";

const ROLES: Record<string, string> = {
  CUSTOMER: "Cliente",
  ADMIN: "Administrador",
  SUPERADMIN: "Superadministrador",
};

export function PerfilView() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <p className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Icon icon="mdi:loading" className="h-4 w-4 animate-spin text-primary" />
        Cargando tu perfil…
      </p>
    );
  }

  return <Perfil user={user} />;
}

function Perfil({ user }: { user: AuthUser }) {
  const { accessToken, actualizarUsuario, reemplazarSesion } = useAuth();

  // Se monta con el usuario ya cargado, asi que alcanza el valor inicial: no
  // hace falta un efecto que rellene los campos despues.
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [claveDeConfirmacion, setClaveDeConfirmacion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorDatos, setErrorDatos] = useState<string | null>(null);
  const [avisoDatos, setAvisoDatos] = useState<string | null>(null);

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [cambiando, setCambiando] = useState(false);
  const [errorClave, setErrorClave] = useState<string | null>(null);
  const [avisoClave, setAvisoClave] = useState<string | null>(null);

  const cambiaElCorreo = email.trim().toLowerCase() !== user.email.toLowerCase();

  async function guardarDatos(evento: FormEvent) {
    evento.preventDefault();
    if (!accessToken || guardando) return;
    setGuardando(true);
    setErrorDatos(null);
    setAvisoDatos(null);
    try {
      const { user: actualizado } = await actualizarPerfilRequest(accessToken, {
        name: name.trim(),
        email: email.trim(),
        ...(cambiaElCorreo ? { password: claveDeConfirmacion } : {}),
      });
      actualizarUsuario(actualizado);
      setClaveDeConfirmacion("");
      setAvisoDatos("Listo, tus datos quedaron guardados.");
    } catch (err) {
      setErrorDatos(err instanceof Error ? err.message : "No se pudieron guardar los datos");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarClave(evento: FormEvent) {
    evento.preventDefault();
    if (!accessToken || cambiando) return;
    if (nueva !== repetida) {
      setErrorClave("Las dos contraseñas nuevas no coinciden");
      return;
    }
    setCambiando(true);
    setErrorClave(null);
    setAvisoClave(null);
    try {
      reemplazarSesion(await cambiarClaveRequest(accessToken, actual, nueva));
      setActual("");
      setNueva("");
      setRepetida("");
      setAvisoClave("Contraseña cambiada. Se cerraron las demás sesiones.");
    } catch (err) {
      setErrorClave(err instanceof Error ? err.message : "No se pudo cambiar la contraseña");
    } finally {
      setCambiando(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-10 px-4 py-14">
      <header>
        <p className="caps text-primary">Tu cuenta</p>
        <h1 className="mt-3 font-serif text-4xl">{user.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {user.email} · {ROLES[user.role] ?? user.role}
        </p>
        {puedeEntrarAlPanel(user.role) ? (
          <Link
            href="/admin"
            className="mt-4 inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
          >
            <Icon icon="mdi:shield-crown-outline" className="h-4 w-4" />
            Ir al panel de administración
          </Link>
        ) : null}
      </header>

      <form onSubmit={guardarDatos} className="surface flex flex-col gap-4 p-6">
        <h2 className="font-serif text-2xl">Tus datos</h2>

        <label className="auth-label">
          Nombre
          <Input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required className="w-full" />
        </label>

        <label className="auth-label">
          Correo electrónico
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full" />
        </label>

        {/* Con una sesión robada, cambiar el correo bastaría para quedarse la
            cuenta; por eso hay que confirmar con la contraseña. */}
        {cambiaElCorreo ? (
          <label className="auth-label">
            Confirmá tu contraseña para cambiar el correo
            <Input
              type="password"
              autoComplete="current-password"
              value={claveDeConfirmacion}
              onChange={(e) => setClaveDeConfirmacion(e.target.value)}
              required
              className="w-full"
            />
          </label>
        ) : null}

        {errorDatos ? (
          <p role="alert" className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-400">
            {errorDatos}
          </p>
        ) : null}
        {avisoDatos ? (
          <p className="flex items-center gap-2 text-sm text-primary">
            <Icon icon="mdi:check-circle-outline" className="h-4 w-4" />
            {avisoDatos}
          </p>
        ) : null}

        <Button type="submit" disabled={guardando} className="w-fit">
          {guardando ? "Guardando…" : "Guardar cambios"}
        </Button>
      </form>

      <form onSubmit={guardarClave} className="surface flex flex-col gap-4 p-6">
        <h2 className="font-serif text-2xl">Cambiar contraseña</h2>

        <label className="auth-label">
          Contraseña actual
          <Input type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} required className="w-full" />
        </label>
        <label className="auth-label">
          Nueva contraseña
          <Input type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} minLength={8} maxLength={72} required placeholder="Mínimo 8 caracteres" className="w-full" />
        </label>
        <label className="auth-label">
          Repetila
          <Input type="password" autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} minLength={8} maxLength={72} required className="w-full" />
        </label>

        {errorClave ? (
          <p role="alert" className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-400">
            {errorClave}
          </p>
        ) : null}
        {avisoClave ? (
          <p className="flex items-center gap-2 text-sm text-primary">
            <Icon icon="mdi:check-circle-outline" className="h-4 w-4" />
            {avisoClave}
          </p>
        ) : null}

        <Button type="submit" disabled={cambiando} className="w-fit">
          {cambiando ? "Cambiando…" : "Cambiar contraseña"}
        </Button>
      </form>
    </section>
  );
}
