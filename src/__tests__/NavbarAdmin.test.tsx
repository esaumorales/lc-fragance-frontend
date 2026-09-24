import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "@/components/organisms/Navbar";
import type { AuthUser } from "@/lib/types";

const { usuario } = vi.hoisted(() => ({ usuario: { actual: null as AuthUser | null } }));
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: usuario.actual, loading: false, logout: vi.fn() }),
}));
vi.mock("@/lib/cart-context", () => ({ useCart: () => ({ items: [], count: 0 }) }));
// El selector de tema tiene su propio contexto y no aporta nada a esta prueba.
vi.mock("@/components/atoms/ThemeToggle", () => ({ ThemeToggle: () => null }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn() }) }));

function conRol(role: AuthUser["role"] | null) {
  usuario.actual = role ? { id: "1", name: "Esau Morales", email: "duenio@example.com", role } : null;
}

// El menú del usuario está cerrado hasta que se toca el avatar.
async function abrirMenuDeUsuario() {
  const user = userEvent.setup();
  const botones = screen.getAllByRole("button");
  for (const boton of botones) {
    await user.click(boton);
    if (screen.queryByRole("link", { name: /Panel de administración/ })) return true;
  }
  return false;
}

describe("Navbar: acceso al panel", () => {
  it("se lo ofrece a un administrador", async () => {
    conRol("ADMIN");
    render(<Navbar />);
    expect(await abrirMenuDeUsuario()).toBe(true);
  });

  // Este es el caso que estaba roto: comparar contra "ADMIN" a secas dejaba al
  // dueño sin ninguna forma de entrar a su propio panel.
  it("se lo ofrece también al superadministrador", async () => {
    conRol("SUPERADMIN");
    render(<Navbar />);
    expect(await abrirMenuDeUsuario()).toBe(true);
  });

  it("no se lo ofrece a un cliente", async () => {
    conRol("CUSTOMER");
    render(<Navbar />);
    expect(await abrirMenuDeUsuario()).toBe(false);
  });
});
