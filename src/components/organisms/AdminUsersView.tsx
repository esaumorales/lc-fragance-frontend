"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  actualizarAdmin,
  crearAdmin,
  eliminarAdmin,
  listarAdmins,
  reenviarAcceso,
} from "@/lib/admin-users-api";
import type { Administrador } from "@/lib/types";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AdminUsersView() {
  const { accessToken, user } = useAuth();
  const [admins, setAdmins] = useState<Administrador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "SUPERADMIN">("ADMIN");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // Cuando el correo no sale, el enlace se muestra para copiarlo a mano.
  const [enlace, setEnlace] = useState<string | null>(null);

  const cargar = useCallback(() => {
    if (!accessToken) return;
    listarAdmins(accessToken)
      .then(setAdmins)
      .catch(() => setError("No se pudieron cargar los administradores"))
      .finally(() => setCargando(false));
  }, [accessToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || enviando) return;
    setEnviando(true);
    setError(null);
    setEnlace(null);

    try {
      const alta = await crearAdmin(accessToken, { name: name.trim(), email: email.trim(), role });
      setName("");
      setEmail("");
      setRole("ADMIN");
      setAviso(
        alta.correoEnviado
          ? `Le mandamos la invitación a ${alta.admin.email}.`
          : `${alta.admin.email} quedó creado, pero el correo no salió. Pasale el enlace vos.`
      );
      if (alta.enlace) setEnlace(alta.enlace);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el administrador");
    } finally {
      setEnviando(false);
    }
  }

  async function cambiar(id: string, cambios: { role?: "ADMIN" | "SUPERADMIN"; isActive?: boolean }) {
    if (!accessToken) return;
    setError(null);
    try {
      await actualizarAdmin(accessToken, id, cambios);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aplicar el cambio");
    }
  }

  async function borrar(admin: Administrador) {
    if (!accessToken) return;
    if (!window.confirm(`¿Eliminar a ${admin.email}? No se puede deshacer.`)) return;
    setError(null);
    try {
      await eliminarAdmin(accessToken, admin.id);
      setAviso(`${admin.email} quedó eliminado.`);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  }

  async function reenviar(admin: Administrador) {
    if (!accessToken) return;
    setError(null);
    setEnlace(null);
    try {
      const envio = await reenviarAcceso(accessToken, admin.id);
      setAviso(
        envio.correoEnviado
          ? `Le mandamos el enlace a ${admin.email}.`
          : `El correo no salió. Pasale el enlace vos.`
      );
      if (envio.enlace) setEnlace(envio.enlace);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el enlace");
    }
  }

  return (
    <section className="flex flex-col gap-8">
      <header>
        <h1 className="font-serif text-2xl text-primary">Administradores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quién entra al panel. Solo vos podés dar de alta o de baja.
        </p>
      </header>

      <form onSubmit={crear} className="flex flex-col gap-4 border border-border p-5 md:flex-row md:items-end">
        <label className="auth-label flex-1">
          Nombre
          <Input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required placeholder="Nombre y apellido" />
        </label>
        <label className="auth-label flex-1">
          Correo
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="nombre@correo.com" />
        </label>
        <label className="auth-label">
          Rol
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "ADMIN" | "SUPERADMIN")}
            className="h-11 border border-border bg-transparent px-3 text-sm text-foreground"
          >
            <option value="ADMIN">Administrador</option>
            <option value="SUPERADMIN">Superadministrador</option>
          </select>
        </label>
        <Button type="submit" disabled={enviando} className="h-11 px-6">
          {enviando ? "Creando…" : "Invitar"}
        </Button>
      </form>

      {aviso && <p className="border border-primary/20 bg-primary/5 p-3 text-sm text-primary">{aviso}</p>}
      {enlace && (
        <label className="auth-label">
          Enlace de acceso, válido 24 horas
          <Input readOnly value={enlace} onFocus={(e) => e.currentTarget.select()} className="w-full font-mono text-xs" />
        </label>
      )}
      {error && <p role="alert" className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-500">{error}</p>}

      {cargando ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon icon="mdi:loading" className="h-4 w-4 animate-spin text-primary" />
          Cargando…
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {admins.map((admin) => {
            const soyYo = admin.id === user?.id;
            return (
              <li key={admin.id} className="flex flex-col gap-3 border border-border p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {admin.name}
                    {soyYo && <span className="ml-2 text-xs text-muted-foreground">(vos)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {admin.role === "SUPERADMIN" ? "Superadministrador" : "Administrador"}
                    {" · "}
                    {admin.isActive ? "Activo" : "Suspendido"}
                    {" · desde "}
                    {fecha(admin.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <button type="button" onClick={() => reenviar(admin)} className="border border-border px-3 py-2 text-xs uppercase tracking-[0.1em] text-muted-foreground hover:border-primary/60 hover:text-primary">
                    Reenviar acceso
                  </button>
                  {!soyYo && (
                    <>
                      <button type="button" onClick={() => cambiar(admin.id, { isActive: !admin.isActive })} className="border border-border px-3 py-2 text-xs uppercase tracking-[0.1em] text-muted-foreground hover:border-primary/60 hover:text-primary">
                        {admin.isActive ? "Suspender" : "Reactivar"}
                      </button>
                      <button type="button" onClick={() => cambiar(admin.id, { role: admin.role === "SUPERADMIN" ? "ADMIN" : "SUPERADMIN" })} className="border border-border px-3 py-2 text-xs uppercase tracking-[0.1em] text-muted-foreground hover:border-primary/60 hover:text-primary">
                        {admin.role === "SUPERADMIN" ? "Quitar mando" : "Dar mando"}
                      </button>
                      <button type="button" onClick={() => borrar(admin)} className="border border-red-400/40 px-3 py-2 text-xs uppercase tracking-[0.1em] text-red-500 hover:bg-red-400/10">
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
