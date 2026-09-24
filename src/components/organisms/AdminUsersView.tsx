"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  actualizarUsuario,
  crearAdmin,
  eliminarUsuario,
  listarUsuarios,
  pedirConfirmacion,
  reenviarAcceso,
  type Confirmacion,
  type ListadoDeUsuarios,
  type UsuarioDelPanel,
} from "@/lib/admin-users-api";
import { esSuperadmin } from "@/lib/roles";
import { cn } from "@/lib/cn";
import type { RolDeUsuario } from "@/lib/types";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";
import { ConfirmacionDialog } from "@/components/organisms/ConfirmacionDialog";

const NOMBRE_DEL_ROL: Record<RolDeUsuario, string> = {
  CUSTOMER: "Cliente",
  ADMIN: "Administrador",
  SUPERADMIN: "Superadministrador",
};

const FILTROS: { id: RolDeUsuario | "TODOS"; label: string }[] = [
  { id: "TODOS", label: "Todos" },
  { id: "CUSTOMER", label: "Clientes" },
  { id: "ADMIN", label: "Administradores" },
  { id: "SUPERADMIN", label: "Superadmin" },
];

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function direccionEnUnaLinea(usuario: UsuarioDelPanel) {
  const d = usuario.address;
  if (!d) return null;
  return [d.street, d.district, d.city].filter(Boolean).join(", ");
}

// Lo que queda pendiente de confirmar mientras el diálogo está abierto.
type Pendiente = {
  titulo: string;
  detalle: string;
  correoEnviado: boolean;
  confirmacionId: string;
  ejecutar: (confirmacion: Confirmacion) => Promise<void>;
};

export function AdminUsersView() {
  const { accessToken, user } = useAuth();
  const soyDuenio = esSuperadmin(user?.role);

  const [datos, setDatos] = useState<ListadoDeUsuarios | null>(null);
  const [filtro, setFiltro] = useState<RolDeUsuario | "TODOS">("TODOS");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "SUPERADMIN">("ADMIN");

  const cargar = useCallback(() => {
    if (!accessToken) return;
    listarUsuarios(accessToken, filtro === "TODOS" ? undefined : filtro)
      .then(setDatos)
      .catch(() => setError("No se pudieron cargar los usuarios"))
      .finally(() => setCargando(false));
  }, [accessToken, filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /** Pide el código y deja la acción esperando a que lo confirmen. */
  async function conConfirmacion(
    titulo: string,
    detalle: string,
    ejecutar: (confirmacion: Confirmacion) => Promise<void>
  ) {
    if (!accessToken) return;
    setError(null);
    setAviso(null);
    setEnlace(null);
    try {
      const { confirmacionId, correoEnviado } = await pedirConfirmacion(accessToken);
      setPendiente({ titulo, detalle, correoEnviado, confirmacionId, ejecutar });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo pedir el código");
    }
  }

  function invitar(evento: FormEvent) {
    evento.preventDefault();
    const datosDelAlta = { name: name.trim(), email: email.trim(), role };
    conConfirmacion(
      "Dar de alta un administrador",
      `${datosDelAlta.email} va a poder entrar al panel.`,
      async (confirmacion) => {
        const alta = await crearAdmin(accessToken!, datosDelAlta, confirmacion);
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
      }
    );
  }

  function cambiar(
    usuario: UsuarioDelPanel,
    cambios: { role?: "ADMIN" | "SUPERADMIN"; isActive?: boolean },
    titulo: string,
    detalle: string
  ) {
    conConfirmacion(titulo, detalle, async (confirmacion) => {
      await actualizarUsuario(accessToken!, usuario.id, cambios, confirmacion);
      setAviso("Cambio aplicado.");
      cargar();
    });
  }

  function borrar(usuario: UsuarioDelPanel) {
    conConfirmacion(
      "Eliminar la cuenta",
      `${usuario.email} se elimina para siempre. No se puede deshacer.`,
      async (confirmacion) => {
        await eliminarUsuario(accessToken!, usuario.id, confirmacion);
        setAviso(`${usuario.email} quedó eliminado.`);
        cargar();
      }
    );
  }

  async function reenviar(usuario: UsuarioDelPanel) {
    if (!accessToken) return;
    setError(null);
    setEnlace(null);
    try {
      const envio = await reenviarAcceso(accessToken, usuario.id);
      setAviso(
        envio.correoEnviado
          ? `Le mandamos el enlace a ${usuario.email}.`
          : "El correo no salió. Pasale el enlace vos."
      );
      if (envio.enlace) setEnlace(envio.enlace);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el enlace");
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="font-serif text-2xl text-foreground">Usuarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {soyDuenio
            ? "Quién tiene cuenta. Cada cambio pide un código que te llega al correo."
            : "Quién tiene cuenta y a dónde enviarle. Solo lectura."}
        </p>
      </header>

      {datos ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["Total", datos.total],
              ["Clientes", datos.porRol.CUSTOMER],
              ["Administradores", datos.porRol.ADMIN],
              ["Superadmin", datos.porRol.SUPERADMIN],
            ] as const
          ).map(([etiqueta, valor]) => (
            <div key={etiqueta} className="surface p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {etiqueta}
              </p>
              <p className="mt-2 font-serif text-3xl text-foreground">{valor}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setFiltro(f.id);
              setCargando(true);
            }}
            aria-pressed={filtro === f.id}
            className={cn(
              "border px-3 py-2 text-xs uppercase tracking-[0.1em] transition-colors",
              filtro === f.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/60 hover:text-primary"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {soyDuenio ? (
        <form
          onSubmit={invitar}
          className="flex flex-col gap-4 border border-border p-5 md:flex-row md:items-end"
        >
          <label className="auth-label flex-1">
            Nombre
            <Input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required placeholder="Nombre y apellido" className="w-full" />
          </label>
          <label className="auth-label flex-1">
            Correo
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="nombre@correo.com" className="w-full" />
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
          <Button type="submit" className="h-11 px-6">
            Invitar
          </Button>
        </form>
      ) : null}

      {aviso ? (
        <p className="border border-primary/20 bg-primary/5 p-3 text-sm text-primary">{aviso}</p>
      ) : null}
      {enlace ? (
        <label className="auth-label">
          Enlace de acceso, válido 24 horas
          <Input readOnly value={enlace} onFocus={(e) => e.currentTarget.select()} className="w-full font-mono text-xs" />
        </label>
      ) : null}
      {error ? (
        <p role="alert" className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon icon="mdi:loading" className="h-4 w-4 animate-spin text-primary" />
          Cargando…
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {datos?.usuarios.map((usuario) => {
            const soyYo = usuario.id === user?.id;
            const esDelPanel = usuario.role !== "CUSTOMER";
            const direccion = direccionEnUnaLinea(usuario);

            return (
              <li key={usuario.id} className="surface flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {usuario.name}
                      {soyYo ? (
                        <span className="ml-2 text-xs text-muted-foreground">(vos)</span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{usuario.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {NOMBRE_DEL_ROL[usuario.role]}
                      {" · "}
                      {usuario.isActive ? "Activo" : "Suspendido"}
                      {" · desde "}
                      {fecha(usuario.createdAt)}
                    </p>
                  </div>
                </div>

                <p className="flex items-start gap-2 border-t border-hairline pt-3 text-xs text-muted-foreground">
                  <Icon icon="mdi:map-marker-outline" className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                  {direccion ? (
                    <span>
                      {direccion}
                      {usuario.address?.phone ? ` · ${usuario.address.phone}` : ""}
                      {usuario.address?.reference ? ` · ${usuario.address.reference}` : ""}
                    </span>
                  ) : (
                    <span>Todavía no cargó una dirección.</span>
                  )}
                </p>

                {soyDuenio ? (
                  <div className="flex flex-wrap gap-2">
                    {esDelPanel ? (
                      <button
                        type="button"
                        onClick={() => reenviar(usuario)}
                        className="border border-border px-3 py-2 text-xs uppercase tracking-[0.1em] text-muted-foreground hover:border-primary/60 hover:text-primary"
                      >
                        Reenviar acceso
                      </button>
                    ) : null}

                    {!soyYo ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            cambiar(
                              usuario,
                              { isActive: !usuario.isActive },
                              usuario.isActive ? "Suspender la cuenta" : "Reactivar la cuenta",
                              usuario.isActive
                                ? `${usuario.email} no va a poder entrar hasta que la reactives.`
                                : `${usuario.email} va a poder entrar de nuevo.`
                            )
                          }
                          className="border border-border px-3 py-2 text-xs uppercase tracking-[0.1em] text-muted-foreground hover:border-primary/60 hover:text-primary"
                        >
                          {usuario.isActive ? "Suspender" : "Reactivar"}
                        </button>

                        {esDelPanel ? (
                          <button
                            type="button"
                            onClick={() =>
                              cambiar(
                                usuario,
                                { role: usuario.role === "SUPERADMIN" ? "ADMIN" : "SUPERADMIN" },
                                usuario.role === "SUPERADMIN" ? "Quitar el mando" : "Dar el mando",
                                usuario.role === "SUPERADMIN"
                                  ? `${usuario.email} deja de poder gestionar cuentas.`
                                  : `${usuario.email} va a poder gestionar cuentas, como vos.`
                              )
                            }
                            className="border border-border px-3 py-2 text-xs uppercase tracking-[0.1em] text-muted-foreground hover:border-primary/60 hover:text-primary"
                          >
                            {usuario.role === "SUPERADMIN" ? "Quitar mando" : "Dar mando"}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => borrar(usuario)}
                          className="border border-red-400/40 px-3 py-2 text-xs uppercase tracking-[0.1em] text-red-400 hover:bg-red-400/10"
                        >
                          Eliminar
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}

          {datos && datos.usuarios.length === 0 ? (
            <p className="surface px-4 py-3 text-sm text-muted-foreground">
              No hay usuarios con ese filtro.
            </p>
          ) : null}
        </ul>
      )}

      {pendiente ? (
        <ConfirmacionDialog
          titulo={pendiente.titulo}
          detalle={pendiente.detalle}
          correoEnviado={pendiente.correoEnviado}
          onCerrar={() => setPendiente(null)}
          onConfirmar={async (codigo) => {
            await pendiente.ejecutar({ confirmacionId: pendiente.confirmacionId, codigo });
            setPendiente(null);
          }}
        />
      ) : null}
    </section>
  );
}
