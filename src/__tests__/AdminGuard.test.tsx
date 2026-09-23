import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminGuard } from "@/components/organisms/AdminGuard";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

let mockAuth: { user: { role: string } | null; loading: boolean } = {
  user: null,
  loading: true,
};
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockAuth,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("AdminGuard", () => {
  it("no redirige mientras la sesión está cargando", () => {
    mockAuth = { user: null, loading: true };
    render(
      <AdminGuard>
        <p>Contenido admin</p>
      </AdminGuard>
    );

    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText("Contenido admin")).not.toBeInTheDocument();
  });

  it("redirige a / si el usuario no es admin", () => {
    mockAuth = { user: { role: "CUSTOMER" }, loading: false };
    render(
      <AdminGuard>
        <p>Contenido admin</p>
      </AdminGuard>
    );

    expect(replace).toHaveBeenCalledWith("/");
    expect(screen.queryByText("Contenido admin")).not.toBeInTheDocument();
  });

  it("redirige a / si no hay usuario autenticado", () => {
    mockAuth = { user: null, loading: false };
    render(
      <AdminGuard>
        <p>Contenido admin</p>
      </AdminGuard>
    );

    expect(replace).toHaveBeenCalledWith("/");
  });

  it("renderiza el contenido cuando el usuario es admin", () => {
    mockAuth = { user: { role: "ADMIN" }, loading: false };
    render(
      <AdminGuard>
        <p>Contenido admin</p>
      </AdminGuard>
    );

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("Contenido admin")).toBeInTheDocument();
  });
});
