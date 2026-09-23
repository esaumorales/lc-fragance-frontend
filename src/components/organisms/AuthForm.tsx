"use client";
import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
export function AuthForm({ variant, onSuccess }: { variant: "login" | "register"; onSuccess?: () => void }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const id = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null); setSubmitting(true);
    try {
      if (variant === "login") await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password);
      if (onSuccess) onSuccess(); else router.push("/");
    } catch (err) { setError(err instanceof Error ? err.message : "No pudimos conectar. Inténtalo de nuevo."); }
    finally { setSubmitting(false); }
  }
  return <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5" aria-busy={submitting}>
    {variant === "register" && <label className="auth-label" htmlFor={`${id}-name`}>Nombre completo<Input id={`${id}-name`} autoComplete="name" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={120} required placeholder="Tu nombre" /></label>}
    <label className="auth-label" htmlFor={`${id}-email`}>Correo electrónico<Input id={`${id}-email`} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="nombre@correo.com" /></label>
    <label className="auth-label" htmlFor={`${id}-password`}>Contraseña<span className="relative block"><Input id={`${id}-password`} className="w-full pr-20" type={visible ? "text" : "password"} autoComplete={variant === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} minLength={variant === "register" ? 8 : 1} maxLength={variant === "register" ? 72 : undefined} required placeholder={variant === "register" ? "Mínimo 8 caracteres" : "Tu contraseña"} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary" aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? "Ocultar" : "Mostrar"}</button></span></label>
    {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-500">{error}</p>}
    <Button type="submit" disabled={submitting} className="mt-1 w-full py-4">{submitting ? "Un momento…" : variant === "login" ? "Iniciar sesión" : "Crear mi cuenta"}</Button>
  </form>;
}
