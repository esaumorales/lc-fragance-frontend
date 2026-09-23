import Link from "next/link";
import { Logo } from "@/components/atoms/Logo";
import { Icon } from "@/components/atoms/Icon";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid mx-auto grid gap-10">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Perfumes y tecnología importados, seleccionados uno por uno. Stock
            real, precio claro y envío coordinado por WhatsApp.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Tienda</p>
          <Link href="/perfumes" className="text-sm text-muted-foreground hover:text-foreground">
            Perfumes
          </Link>
          <Link href="/tecnologia" className="text-sm text-muted-foreground hover:text-foreground">
            Tecnología
          </Link>
          <Link href="/carrito" className="text-sm text-muted-foreground hover:text-foreground">
            Carrito
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Cuenta</p>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Iniciar sesión
          </Link>
          <Link href="/registro" className="text-sm text-muted-foreground hover:text-foreground">
            Crear cuenta
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Contacto</p>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon icon="mdi:whatsapp" className="h-4 w-4 text-primary" />
            Coordinación por WhatsApp
          </span>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon icon="mdi:cash" className="h-4 w-4 text-primary" />
            Pagos por Yape
          </span>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="footer-bottom mx-auto flex flex-col items-center justify-between gap-2 text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} LC Fragance. Todos los derechos reservados.</p>
          <p>Creado por Biznovatech</p>
        </div>
      </div>
    </footer>
  );
}


