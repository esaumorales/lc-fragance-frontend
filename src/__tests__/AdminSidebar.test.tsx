import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminSidebar } from "@/components/organisms/AdminSidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));

const ENLACES = [
  ["Resumen", "/admin"],
  ["Productos", "/admin/productos"],
  ["Pedidos", "/admin/pedidos"],
  ["Categorías", "/admin/categorias"],
  ["Usuarios", "/admin/usuarios"],
] as const;

describe("AdminSidebar", () => {
  it("lleva a todas las secciones del panel", () => {
    render(<AdminSidebar />);

    for (const [etiqueta, destino] of ENLACES) {
      expect(screen.getByRole("link", { name: new RegExp(etiqueta) })).toHaveAttribute(
        "href",
        destino
      );
    }
  });

  // Ver la lista alcanza con ser admin; lo que un admin no puede hacer lo
  // corta el backend y la propia pantalla.
  it("Usuarios no depende del rol", () => {
    render(<AdminSidebar />);
    expect(screen.getByRole("link", { name: /Usuarios/ })).toBeInTheDocument();
  });

  it("marca la sección actual", () => {
    render(<AdminSidebar />);
    expect(screen.getByRole("link", { name: /Resumen/ })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("link", { name: /Pedidos/ })).toHaveAttribute("data-active", "false");
  });
});
