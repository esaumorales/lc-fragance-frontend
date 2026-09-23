"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { restablecerRequest } from "@/lib/auth-api";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";

type Props = {
  token: string | undefined;
  // La invitacion y el restablecimiento usan el mismo formulario y difieren
  // solo en los textos.
  variante: "invitacion" | "restablecer";
};

export function ElegirContrasena({ token, variante }: Props) {
  const [password, setPassword] = useState("");
  const [repetida, setRepetida] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const titulo = variante === "invitacion" ? "Elegí tu contraseña" : "Poné una contraseña nueva";

  async function enviar(event: FormEvent) {
    event.preventDefault();
    if (enviando || !token) return;
    if (password !== repetida) {
      setError("Las dos contraseñas no coinciden");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await restablecerRequest(token, password);
      setListo(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la contraseña");
    } finally {
      setEnviando(false);
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-muted-foreground">
        Este enlace está incompleto. Pedí uno nuevo a quien administra el sistema.
      </p>
    );
  }

  if (listo) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-sm text-foreground">Listo, tu contraseña quedó guardada.</p>
        <Link href="/login" className="text-sm text-primary underline-offset-4 hover:underline">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex w-full flex-col gap-5" aria-busy={enviando}>
      <h1 className="font-serif text-2xl text-primary">{titulo}</h1>
      <label className="auth-label">
        Contraseña
        <Input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          maxLength={72}
          required
          placeholder="Mínimo 8 caracteres"
          className="w-full"
        />
      </label>
      <label className="auth-label">
        Repetila
        <Input
          type="password"
          autoComplete="new-password"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
          minLength={8}
          maxLength={72}
          required
          placeholder="La misma de arriba"
          className="w-full"
        />
      </label>
      {error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-500">
          {error}
        </p>
      )}
      <Button type="submit" disabled={enviando} className="mt-1 w-full py-4">
        {enviando ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
