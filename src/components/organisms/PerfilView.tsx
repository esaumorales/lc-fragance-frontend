"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { actualizarPerfilRequest, cambiarClaveRequest } from "@/lib/auth-api";
import { puedeEntrarAlPanel } from "@/lib/roles";
import { cn } from "@/lib/cn";
import type { AuthUser } from "@/lib/types";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";
import { DireccionForm } from "@/components/organisms/DireccionForm";

const ROLES: Record<string, string> = {
  CUSTOMER: "Cliente",
  ADMIN: "Administrador",
  SUPERADMIN: "Superadministrador",
};

const SECCIONES = [
  { id: "datos", label: "Datos", icon: "mdi:account-outline" },
  { id: "seguridad", label: "Seguridad", icon: "mdi:lock-outline" },
  { id: "direccion", label: "Dirección", icon: "mdi:map-marker-outline" },
] as const;

type Seccion = (typeof SECCIONES)[number]["id"];

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
  const { accessToken } = useAuth();
  const [seccion, setSeccion] = useState<Seccion>("datos");
  // Una seccion se monta la primera vez que se abre y despues solo se oculta:
  // si se desmontara, volver a Direccion pediria la direccion de nuevo y se
  // veria un "Cargando" cada vez.
  const [visitadas, setVisitadas] = useState<Seccion[]>(["datos"]);

  function abrir(id: Seccion) {
    setSeccion(id);
    setVisitadas((previas) => (previas.includes(id) ? previas : [...previas, id]));
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-14">
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

      <nav role="tablist" aria-label="Secciones del perfil" className="flex gap-2 overflow-x-auto border-b border-hairline">
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            id={`pestana-${s.id}`}
            aria-selected={seccion === s.id}
            aria-controls={`panel-${s.id}`}
            onClick={() => abrir(s.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm transition-colors",
              seccion === s.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon icon={s.icon} className="h-4 w-4" />
            {s.label}
          </button>
        ))}
      </nav>

      {SECCIONES.map((s) =>
        visitadas.includes(s.id) ? (
          <div
            key={s.id}
            role="tabpanel"
            id={`panel-${s.id}`}
            aria-labelledby={`pestana-${s.id}`}
            // El atributo, y no una clase: ademas lo saca del arbol de
            // accesibilidad, asi un lector de pantalla no lee tres paneles.
            hidden={seccion !== s.id}
            className="surface p-6"
          >
            {s.id === "datos" ? <Datos user={user} /> : null}
            {s.id === "seguridad" ? <Seguridad /> : null}
            {s.id === "direccion" ? (
              accessToken ? (
                <DireccionForm accessToken={accessToken} />
              ) : (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              )
            ) : null}
          </div>
        ) : null
      )}
    </section>
  );
}

function Datos({ user }: { user: AuthUser }) {
  const { accessToken, actualizarUsuario } = useAuth();
  // Se monta con el usuario ya cargado: alcanza el valor inicial, sin efecto.
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [claveDeConfirmacion, setClaveDeConfirmacion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cambiaElCorreo = email.trim().toLowerCase() !== user.email.toLowerCase();

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (!accessToken || guardando) return;
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      const { user: actualizado } = await actualizarPerfilRequest(accessToken, {
        name: name.trim(),
        email: email.trim(),
        ...(cambiaElCorreo ? { password: claveDeConfirmacion } : {}),
      });
      actualizarUsuario(actualizado);
      setClaveDeConfirmacion("");
      setAviso("Listo, tus datos quedaron guardados.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los datos");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
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

      {error ? (
        <p role="alert" className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}
      {aviso ? (
        <p className="flex items-center gap-2 text-sm text-primary">
          <Icon icon="mdi:check-circle-outline" className="h-4 w-4" />
          {aviso}
        </p>
      ) : null}

      <Button type="submit" disabled={guardando} className="w-fit">
        {guardando ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}

function Seguridad() {
  const { accessToken, reemplazarSesion } = useAuth();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [cambiando, setCambiando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (!accessToken || cambiando) return;
    if (nueva !== repetida) {
      setError("Las dos contraseñas nuevas no coinciden");
      return;
    }
    setCambiando(true);
    setError(null);
    setAviso(null);
    try {
      reemplazarSesion(await cambiarClaveRequest(accessToken, actual, nueva));
      setActual("");
      setNueva("");
      setRepetida("");
      setAviso("Contraseña cambiada. Se cerraron las demás sesiones.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña");
    } finally {
      setCambiando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Al cambiarla se cierran las sesiones abiertas en otros dispositivos. Esta sigue activa.
      </p>

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

      {error ? (
        <p role="alert" className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}
      {aviso ? (
        <p className="flex items-center gap-2 text-sm text-primary">
          <Icon icon="mdi:check-circle-outline" className="h-4 w-4" />
          {aviso}
        </p>
      ) : null}

      <Button type="submit" disabled={cambiando} className="w-fit">
        {cambiando ? "Cambiando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
