import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "@/components/organisms/Navbar";

vi.mock("@iconify/react", () => ({
  Icon: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

const logout = vi.fn();
let mockUser: { name: string; email: string; role: string } | null = null;
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: mockUser, logout, loading: false }),
}));

vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({ itemCount: 0 }),
}));

vi.mock("@/lib/theme-context", () => ({
  useTheme: () => ({ theme: "dark", toggle: vi.fn() }),
}));

afterEach(() => {
  vi.clearAllMocks();
  mockUser = null;
});

// El nav de escritorio vive siempre en el DOM (se oculta por CSS responsive,
// que jsdom no evalúa), así que el estado del menú móvil se verifica por la
// cantidad de links "Perfumes" presentes, no por su sola existencia.
describe("Navbar", () => {
  it("el menú móvil arranca cerrado", () => {
    render(<Navbar />);
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute(
    "aria-expanded",
    "false"
    );
    expect(screen.getAllByRole("link", { name: "Perfumes" })).toHaveLength(1);
  });

  it("abre el menú móvil al tocar el botón de hamburguesa y muestra los links", async () => {
    render(<Navbar />);

    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));

    expect(screen.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute(
    "aria-expanded",
    "true"
    );
    expect(screen.getAllByRole("link", { name: "Perfumes" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Tecnología" })).toHaveLength(2);
  });

  it("cierra el menú al tocar un link dentro de él", async () => {
    render(<Navbar />);

    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const perfumesLinks = screen.getAllByRole("link", { name: "Perfumes" });
    await userEvent.click(perfumesLinks[perfumesLinks.length - 1]);

    expect(screen.getAllByRole("link", { name: "Perfumes" })).toHaveLength(1);
  });

  it("abrir el menú de cuenta NO cierra la sesión", async () => {
    mockUser = { name: "Ana Test", email: "ana@example.com", role: "CUSTOMER" };
    render(<Navbar />);

    await userEvent.click(screen.getByRole("button", { name: "Cuenta" }));

    expect(logout).not.toHaveBeenCalled();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
  });

  it("cerrar sesión solo ocurre al tocar el botón explícito dentro del menú de cuenta", async () => {
    mockUser = { name: "Ana Test", email: "ana@example.com", role: "CUSTOMER" };
    render(<Navbar />);

    await userEvent.click(screen.getByRole("button", { name: "Cuenta" }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(logout).toHaveBeenCalledOnce();
  });

  it("el menú de cuenta muestra el link de admin solo para rol ADMIN", async () => {
    mockUser = { name: "Admin LC Fragance", email: "admin@lyoncall.com", role: "ADMIN" };
    render(<Navbar />);

    await userEvent.click(screen.getByRole("button", { name: "Cuenta" }));

    expect(screen.getByRole("link", { name: /Panel de administración/ })).toBeInTheDocument();
  });
});

