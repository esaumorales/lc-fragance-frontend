import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FooterCuenta } from "@/components/organisms/FooterCuenta";
import type { AuthUser } from "@/lib/types";

const { sesion, logout } = vi.hoisted(() => ({
  sesion: { user: null as AuthUser | null, loading: false },
  logout: vi.fn(),
}));
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: sesion.user, loading: sesion.loading, logout }),
}));

function conSesion(role: AuthUser["role"] | null, loading = false) {
  sesion.loading = loading;
  sesion.user = role
    ? { id: "1", name: "Esau Morales", email: "duenio@example.com", role }
    : null;
}

describe("FooterCuenta", () => {
  it("sin sesión ofrece entrar o registrarse", () => {
    conSesion(null);
    render(<FooterCuenta />);
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crear cuenta" })).toBeInTheDocument();
  });

  // El bug que veía el usuario: el pie le ofrecía entrar estando ya adentro.
  it("con sesión no ofrece iniciar sesión ni crear cuenta", () => {
    conSesion("CUSTOMER");
    render(<FooterCuenta />);
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Crear cuenta" })).toBeNull();
    expect(screen.getByText("Esau Morales")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
  });

  it("al superadministrador le ofrece el panel", () => {
    conSesion("SUPERADMIN");
    render(<FooterCuenta />);
    expect(screen.getByRole("link", { name: "Panel de administración" })).toHaveAttribute(
      "href",
      "/admin"
    );
  });

  it("a un cliente no le ofrece el panel", () => {
    conSesion("CUSTOMER");
    render(<FooterCuenta />);
    expect(screen.queryByRole("link", { name: "Panel de administración" })).toBeNull();
  });

  // Si no, al recargar parpadea "Iniciar sesión" antes de restaurar la sesión.
  it("no muestra nada mientras la sesión se está restaurando", () => {
    conSesion(null, true);
    const { container } = render(<FooterCuenta />);
    expect(container).toBeEmptyDOMElement();
  });

  it("cerrar sesión llama a logout", async () => {
    conSesion("ADMIN");
    const user = userEvent.setup();
    render(<FooterCuenta />);
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(logout).toHaveBeenCalledOnce();
  });
});
