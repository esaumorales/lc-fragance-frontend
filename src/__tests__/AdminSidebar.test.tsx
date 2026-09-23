import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminSidebar } from "@/components/organisms/AdminSidebar";
import type { AuthUser } from "@/lib/types";

const { usuario } = vi.hoisted(() => ({ usuario: { actual: null as AuthUser | null } }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: usuario.actual }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));

function conRol(role: AuthUser["role"]) {
  usuario.actual = { id: "1", name: "Esau", email: "duenio@example.com", role };
}

describe("AdminSidebar", () => {
  it("le muestra Administradores al superadministrador", () => {
    conRol("SUPERADMIN");
    render(<AdminSidebar />);
    expect(screen.getByRole("link", { name: /Administradores/ })).toHaveAttribute(
      "href",
      "/admin/administradores"
    );
  });

  it("se la esconde a un administrador común", () => {
    conRol("ADMIN");
    render(<AdminSidebar />);
    expect(screen.queryByRole("link", { name: /Administradores/ })).toBeNull();
  });

  it("los enlaces del catálogo los ven los dos", () => {
    conRol("ADMIN");
    render(<AdminSidebar />);
    expect(screen.getByRole("link", { name: /Productos/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Categorías/ })).toBeInTheDocument();
  });
});
