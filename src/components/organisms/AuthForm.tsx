"use client";
import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { olvideRequest } from "@/lib/auth-api";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import type { DesafioSegundoFactor } from "@/lib/types";
export function AuthForm({ variant, onSuccess }: { variant: "login" | "register"; onSuccess?: () => void }) {
  const { login, completarCodigo, register } = useAuth();
  const router = useRouter();
  const id = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Mientras haya desafío pendiente, el formulario muestra el paso del código.
  const [desafio, setDesafio] = useState<DesafioSegundoFactor | null>(null);
  const [codigo, setCodigo] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  function terminar() { if (onSuccess) onSuccess(); else router.push("/"); }
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null); setSubmitting(true);
    try {
      if (variant === "register") { await register(name.trim(), email.trim(), password); terminar(); return; }
      const pendiente = await login(email.trim(), password);
      if (pendiente) { setDesafio(pendiente); return; }
      terminar();
    } catch (err) { setError(err instanceof Error ? err.message : "No pudimos conectar. Inténtalo de nuevo."); }
    finally { setSubmitting(false); }
  }
  async function handleCodigo(event: FormEvent) {
    event.preventDefault();
    if (submitting || !desafio) return;
    setError(null); setSubmitting(true);
    try { await completarCodigo(desafio.desafioId, codigo.trim()); terminar(); }
    catch (err) { setError(err instanceof Error ? err.message : "No pudimos verificar el código."); }
    finally { setSubmitting(false); }
  }
  function volver() { setDesafio(null); setCodigo(""); setError(null); setPassword(""); }
  async function recuperar() {
    if (!email.trim()) { setError("Escribí tu correo y volvé a tocar el enlace."); return; }
    setError(null);
    // La respuesta es la misma exista o no la cuenta, asi que no se distingue.
    await olvideRequest(email.trim()).catch(() => {});
    setAviso("Si ese correo tiene cuenta, le llega un enlace para cambiar la contraseña.");
  }
  if (desafio) return <form onSubmit={handleCodigo} className="flex w-full flex-col gap-5" aria-busy={submitting}>
    <p className="text-sm text-primary">Te mandamos un código de seis dígitos a <strong>{email.trim()}</strong>.</p>
    {!desafio.correoEnviado && <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-600">El servidor todavía no tiene el correo configurado, así que el código no salió. Pedíselo a quien administra el sistema.</p>}
    <label className="auth-label" htmlFor={`${id}-codigo`}>Código de acceso<Input id={`${id}-codigo`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, ""))} required placeholder="000000" className="w-full text-center text-2xl tracking-[0.5em]" autoFocus /></label>
    {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-500">{error}</p>}
    <Button type="submit" disabled={submitting || codigo.length !== 6} className="mt-1 w-full py-4">{submitting ? "Verificando…" : "Entrar"}</Button>
    <button type="button" onClick={volver} className="text-sm text-primary underline-offset-4 hover:underline">Volver</button>
  </form>;
  return <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5" aria-busy={submitting}>
    {variant === "register" && <label className="auth-label" htmlFor={`${id}-name`}>Nombre completo<Input id={`${id}-name`} autoComplete="name" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={120} required placeholder="Tu nombre" /></label>}
    <label className="auth-label" htmlFor={`${id}-email`}>Correo electrónico<Input id={`${id}-email`} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="nombre@correo.com" /></label>
    <label className="auth-label" htmlFor={`${id}-password`}>Contraseña<span className="relative block"><Input id={`${id}-password`} className="w-full pr-20" type={visible ? "text" : "password"} autoComplete={variant === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} minLength={variant === "register" ? 8 : 1} maxLength={variant === "register" ? 72 : undefined} required placeholder={variant === "register" ? "Mínimo 8 caracteres" : "Tu contraseña"} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary" aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? "Ocultar" : "Mostrar"}</button></span></label>
    {variant === "login" && <button type="button" onClick={recuperar} className="self-start text-sm text-primary underline-offset-4 hover:underline">Olvidé mi contraseña</button>}
    {aviso && <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">{aviso}</p>}
    {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-500">{error}</p>}
    <Button type="submit" disabled={submitting} className="mt-1 w-full py-4">{submitting ? "Un momento…" : variant === "login" ? "Iniciar sesión" : "Crear mi cuenta"}</Button>
  </form>;
}
