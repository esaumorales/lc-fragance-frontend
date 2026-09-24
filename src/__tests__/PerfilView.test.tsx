import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PerfilView } from "@/components/organisms/PerfilView";
import type { AuthUser } from "@/lib/types";

vi.mock("@iconify/react", () => ({ Icon: ({ icon }: { icon: string }) => <span data-icon={icon} /> }));

const { sesion, actualizarUsuario, reemplazarSesion, actualizarPerfil, cambiarClave, replace } =
  vi.hoisted(() => ({
    sesion: { user: null as AuthUser | null, loading: false },
    actualizarUsuario: vi.fn(),
    reemplazarSesion: vi.fn(),
    actualizarPerfil: vi.fn(),
    cambiarClave: vi.fn(),
    replace: vi.fn(),
  }));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: sesion.user,
    loading: sesion.loading,
    accessToken: "un-token",
    actualizarUsuario,
    reemplazarSesion,
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/auth-api", () => ({
  actualizarPerfilRequest: actualizarPerfil,
  cambiarClaveRequest: cambiarClave,
}));

const cliente: AuthUser = {
  id: "u-1",
  name: "Cliente Prueba",
  email: "cliente@example.com",
  role: "CUSTOMER",
};

beforeEach(() => {
  vi.clearAllMocks();
  sesion.user = cliente;
  sesion.loading = false;
});

describe("PerfilView", () => {
  it("muestra los datos de la cuenta cargados en los campos", () => {
    render(<PerfilView />);

    expect(screen.getByLabelText("Nombre")).toHaveValue("Cliente Prueba");
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("cliente@example.com");
    expect(screen.getByText(/Cliente$/)).toBeInTheDocument();
  });

  it("a un cliente no le ofrece el panel", () => {
    render(<PerfilView />);
    expect(screen.queryByRole("link", { name: /panel de administración/i })).toBeNull();
  });

  it("al superadministrador sí", () => {
    sesion.user = { ...cliente, role: "SUPERADMIN" };
    render(<PerfilView />);
    expect(screen.getByRole("link", { name: /panel de administración/i })).toHaveAttribute(
      "href",
      "/admin"
    );
  });

  it("cambiar solo el nombre no pide la contraseña", async () => {
    const user = userEvent.setup();
    actualizarPerfil.mockResolvedValue({ user: { ...cliente, name: "Otro Nombre" } });
    render(<PerfilView />);

    const nombre = screen.getByLabelText("Nombre");
    await user.clear(nombre);
    await user.type(nombre, "Otro Nombre");

    expect(screen.queryByLabelText(/Confirmá tu contraseña/)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(actualizarPerfil).toHaveBeenCalledOnce());
    expect(actualizarPerfil.mock.calls[0]![1]).not.toHaveProperty("password");
    expect(actualizarUsuario).toHaveBeenCalledWith({ ...cliente, name: "Otro Nombre" });
  });

  // Con una sesión robada, cambiar el correo bastaría para quedarse la cuenta.
  it("al tocar el correo aparece la confirmación de contraseña y viaja con ella", async () => {
    const user = userEvent.setup();
    actualizarPerfil.mockResolvedValue({ user: { ...cliente, email: "nuevo@example.com" } });
    render(<PerfilView />);

    const correo = screen.getByLabelText("Correo electrónico");
    await user.clear(correo);
    await user.type(correo, "nuevo@example.com");

    const confirmacion = await screen.findByLabelText(/Confirmá tu contraseña/);
    await user.type(confirmacion, "miClaveActual");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(actualizarPerfil).toHaveBeenCalledOnce());
    expect(actualizarPerfil.mock.calls[0]![1].password).toBe("miClaveActual");
  });

  it("muestra el error que devuelve el servidor", async () => {
    const user = userEvent.setup();
    actualizarPerfil.mockRejectedValue(new Error("Ese correo ya tiene cuenta"));
    render(<PerfilView />);

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ese correo ya tiene cuenta");
  });
});

describe("PerfilView: contraseña", () => {
  async function completarClaves(nueva: string, repetida: string) {
    const user = userEvent.setup();
    render(<PerfilView />);
    await user.type(screen.getByLabelText("Contraseña actual"), "miClaveActual");
    await user.type(screen.getByLabelText("Nueva contraseña"), nueva);
    await user.type(screen.getByLabelText("Repetila"), repetida);
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    return user;
  }

  it("no llama al servidor si las dos nuevas no coinciden", async () => {
    await completarClaves("unaClaveNueva1", "otraDistinta1");

    expect(cambiarClave).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent("no coinciden");
  });

  it("cambia la contraseña y renueva la sesión para no quedar afuera", async () => {
    cambiarClave.mockResolvedValue({ accessToken: "nuevo-token", user: cliente });
    await completarClaves("unaClaveNueva1", "unaClaveNueva1");

    await waitFor(() =>
      expect(cambiarClave).toHaveBeenCalledWith("un-token", "miClaveActual", "unaClaveNueva1")
    );
    expect(reemplazarSesion).toHaveBeenCalledWith({ accessToken: "nuevo-token", user: cliente });
  });
});

describe("PerfilView: sin sesión", () => {
  it("manda al login", () => {
    sesion.user = null;
    render(<PerfilView />);
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("mientras carga no decide nada", () => {
    sesion.user = null;
    sesion.loading = true;
    render(<PerfilView />);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText(/Cargando tu perfil/)).toBeInTheDocument();
  });
});
