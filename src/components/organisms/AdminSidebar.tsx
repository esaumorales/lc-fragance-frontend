"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/atoms/Icon";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import { esSuperadmin } from "@/lib/roles";

const links = [
  { href: "/admin", label: "Resumen", icon: "mdi:view-dashboard-outline" },
  { href: "/admin/productos", label: "Productos", icon: "mdi:bottle-tonic-outline" },
  { href: "/admin/pedidos", label: "Pedidos", icon: "mdi:receipt-text-outline" },
  { href: "/admin/categorias", label: "Categorías", icon: "mdi:shape-outline" },
];

// Solo el dueño la ve; la ruta ademas la protege el backend.
const enlaceDeAdmins = {
  href: "/admin/administradores",
  label: "Administradores",
  icon: "mdi:account-key-outline",
};

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const visibles = esSuperadmin(user?.role) ? [...links, enlaceDeAdmins] : links;

  return (
    <nav className="admin-sidebar flex flex-col gap-5">
      <div className="flex items-center gap-2 text-primary">
        <Icon icon="mdi:shield-crown-outline" className="h-5 w-5" />
        <span className="font-serif text-sm uppercase tracking-[0.2em]">Admin</span>
      </div>

      <div className="flex flex-row gap-2 overflow-x-auto md:flex-col">
        {visibles.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href} data-active={active}
              href={link.href}
              className={cn(
                "flex shrink-0 items-center gap-2 border px-3 py-2 text-xs uppercase tracking-[0.1em] transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/60 hover:text-primary"
              )}
            >
              <Icon icon={link.icon} className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

