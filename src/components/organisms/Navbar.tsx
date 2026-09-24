"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Icon } from "@/components/atoms/Icon";
import { Logo } from "@/components/atoms/Logo";
import { ThemeToggle } from "@/components/atoms/ThemeToggle";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { puedeEntrarAlPanel } from "@/lib/roles";

const navLinks = [
  { href: "/perfumes", label: "Perfumes" },
  { href: "/tecnologia", label: "Tecnología" },
];

/**
 * El scroll es estado externo. Con useEffect habria que invocar el handler una
 * vez para tomar el valor inicial, y eso es un setState sincrono dentro del
 * efecto (lo mismo que se corrigio en el resto de la app).
 */
function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

function useScrolled() {
  return useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 12,
    () => false
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="caps underline-grow text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
    </Link>
  );
}

// Cuenta: un click en el ícono/nombre solo abre este menú (no cierra la
// sesión). "Cerrar sesión" es una acción aparte y explícita adentro.
function AccountMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
        aria-expanded={open}
        aria-label="Cuenta"
      >
        <Icon icon="mdi:account-outline" className="h-[18px] w-[18px]" />
        <span className="caps hidden lg:inline">{user.name.split(" ")[0]}</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full mt-4 w-60 border border-hairline bg-surface shadow-[0_28px_60px_-24px_rgba(0,0,0,0.7)]">
          <div className="border-b border-hairline px-5 py-4">
            <p className="font-serif text-lg text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex flex-col py-2">
            {puedeEntrarAlPanel(user.role) ? (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <Icon icon="mdi:shield-crown-outline" className="h-4 w-4" />
                Panel de administración
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex items-center gap-2.5 px-5 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Icon icon="mdi:logout" className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Header de retail de lujo: wordmark centrado, navegación de un lado y
 * acciones del otro. Arriba de todo va transparente sobre el hero y recién al
 * bajar aparecen el fondo y el filete. El formato anterior —logo a la
 * izquierda, todo en una fila con marcos— se leía como panel de aplicación,
 * no como tienda.
 */
export function Navbar() {
  const { user, logout, loading } = useAuth();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled();

  return (
    <header className="site-header sticky top-0 z-40">
      <div className="announcement-bar">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2.5 px-6 py-2 text-[10px] tracking-[0.28em] text-muted-foreground">
          <Icon icon="mdi:whatsapp" className="h-3.5 w-3.5 text-primary" />
          <span className="hidden sm:inline">ENVÍOS COORDINADOS POR WHATSAPP</span>
          <span className="hidden text-primary/40 sm:inline">·</span>
          <span>PAGO POR YAPE</span>
        </div>
      </div>

      <div
        className={cn(
          "transition-all duration-500",
          scrolled
            ? "border-b border-hairline/70 bg-background/90 backdrop-blur-md"
            : "border-b border-hairline/40 bg-background/95 backdrop-blur-md"
        )}
      >
        <nav
          className={cn(
            "site-nav mx-auto grid grid-cols-[1fr_auto_1fr] items-center px-5 transition-all duration-500 sm:px-8",
            scrolled ? "py-3" : "py-6"
          )}
        >
          <div className="flex items-center gap-9">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="text-foreground md:hidden"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
            >
              <Icon icon={menuOpen ? "mdi:close" : "mdi:menu"} className="h-5 w-5" />
            </button>

            <div className="hidden items-center gap-9 md:flex">
              {navLinks.map((link) => (
                <NavLink key={link.href} {...link} />
              ))}
            </div>
          </div>

          <Link href="/" onClick={() => setMenuOpen(false)} className="justify-self-center">
            <Logo compact={scrolled} />
          </Link>

          <div className="flex items-center justify-end gap-5 sm:gap-6">
            <ThemeToggle className="text-muted-foreground transition-colors hover:text-primary" />

            {!loading && user ? (
              <AccountMenu />
            ) : !loading ? (
              <Link
                href="/login" aria-label="Iniciar sesión"
                className="hidden items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary sm:flex"
              >
                <Icon icon="mdi:account-outline" className="h-[18px] w-[18px]" />
                <span className="caps hidden lg:inline">Ingresar</span>
              </Link>
            ) : null}

            <Link
              href="/carrito"
              onClick={() => setMenuOpen(false)}
              className="relative text-muted-foreground transition-colors hover:text-primary"
              aria-label={itemCount > 0 ? `Carrito, ${itemCount} artículos` : "Carrito"}
            >
              <Icon icon="mdi:shopping-outline" className="h-[18px] w-[18px]" />
              {itemCount > 0 ? (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                  {itemCount}
                </span>
              ) : null}
            </Link>
          </div>
        </nav>
      </div>

      {/* Menú móvil como cortina a pantalla completa: un desplegable chico se
          siente a formulario; esto, con la serif grande, se siente a tienda. */}
      {menuOpen ? (
        <div className="fixed inset-x-0 bottom-0 top-[7.5rem] z-40 bg-background md:hidden">
          <div className="flex flex-col px-8 pt-8">
            {navLinks.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="anim-fade-up border-b border-hairline/50 py-5 font-serif text-3xl tracking-wide text-foreground"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-10 flex flex-col gap-5">
              {!loading && puedeEntrarAlPanel(user?.role) ? (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="caps flex items-center gap-2.5 text-muted-foreground"
                >
                  <Icon icon="mdi:shield-crown-outline" className="h-4 w-4" />
                  Administración
                </Link>
              ) : null}

              {!loading && user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="caps flex items-center gap-2.5 text-left text-muted-foreground"
                >
                  <Icon icon="mdi:logout" className="h-4 w-4" />
                  Cerrar sesión ({user.name.split(" ")[0]})
                </button>
              ) : !loading ? (
                <Link
                  href="/login" aria-label="Iniciar sesión"
                  onClick={() => setMenuOpen(false)}
                  className="caps flex items-center gap-2.5 text-muted-foreground"
                >
                  <Icon icon="mdi:account-outline" className="h-4 w-4" />
                  Ingresar
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}


