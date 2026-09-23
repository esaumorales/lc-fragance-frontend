"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AuthForm } from "./AuthForm";
type Variant = "login" | "register";
export function AuthModal({ initialVariant }: { initialVariant?: Variant }) {
  const [variant, setVariant] = useState<Variant | null>(initialVariant ?? null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const isOpen = variant !== null;
  function close() { setVariant(null); if (initialVariant) router.replace("/"); }
  useEffect(() => {
    if (initialVariant) return;
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || !["/login", "/registro"].includes(url.pathname) || ["/login", "/registro"].includes(location.pathname)) return;
      event.preventDefault(); trigger.current = link;
      setVariant(url.pathname === "/login" ? "login" : "register");
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [initialVariant]);
  useEffect(() => {
    const node = dialog.current;
    if (!isOpen || !node) return;
    node.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { node.close(); document.body.style.overflow = previous; trigger.current?.focus(); };
  }, [isOpen]);
  if (!variant) return null;
  return <dialog ref={dialog} className="auth-dialog" aria-labelledby="auth-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <div className="relative grid overflow-hidden md:grid-cols-[0.8fr_1fr]">
      <button autoFocus type="button" aria-label="Cerrar" onClick={close} className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface text-xl">×</button>
      <div className="hidden flex-col justify-center bg-[#0b0b0b] p-8 text-center md:flex"><Image src="/brand/lc-fragance.png" alt="LC Fragance" width={400} height={400} /><p className="mt-6 font-serif text-3xl text-[#f5f1e7]">Una esencia.<br /><em className="text-[#d4af37]">Tu identidad.</em></p></div>
      <div className="p-7 pt-16 sm:p-12 sm:pt-16"><p className="caps text-primary">BIENVENIDO A LC FRAGANCE</p><h2 id="auth-title" className="mb-3 mt-4 font-serif text-4xl">{variant === "login" ? "Qué bueno verte" : "Tu historia comienza aquí"}</h2><p className="mb-7 text-sm text-muted-foreground">Descubre tu próxima esencia.</p>
        <div className="mb-7 grid grid-cols-2 border-b border-hairline">{(["login", "register"] as const).map(v => <button key={v} type="button" onClick={() => setVariant(v)} className={`border-b-2 py-3 text-sm ${variant === v ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`} aria-pressed={variant === v}>{v === "login" ? "Iniciar sesión" : "Crear cuenta"}</button>)}</div>
        <AuthForm key={variant} variant={variant} onSuccess={close} />
      </div>
    </div>
  </dialog>;
}

