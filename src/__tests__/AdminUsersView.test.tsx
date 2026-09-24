import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminUsersView } from "@/components/organisms/AdminUsersView";
import type { AuthUser } from "@/lib/types";
import type { UsuarioDelPanel } from "@/lib/admin-users-api";

vi.mock("@iconify/react", () => ({ Icon: ({ icon }: { icon: string }) => <span data-icon={icon} /> }));

const { sesion, listar, pedir, crear, actualizar, eliminar, reenviar } = vi.hoisted(() => ({
  sesion: { user: null as AuthUser | null },
  listar: vi.fn(),
  pedir: vi.fn(),
  crear: vi.fn(),
  actualizar: vi.fn(),
  eliminar: vi.fn(),
  reenviar: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ accessToken: "un-token", user: sesion.user }),
}));
vi.mock("@/lib/admin-users-api", () => ({
  listarUsuarios: listar,
  pedirConfirmacion: pedir,
  crearAdmin: crear,
  actualizarUsuario: actualizar,
  eliminarUsuario: eliminar,
  reenviarAcceso: reenviar,
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

const duenio: AuthUser = {
  id: "u-duenio",
  name: "Esau",
  email: "duenio@example.com",
  role: "SUPERADMIN",
};

const cliente: UsuarioDelPanel = {
  id: "u-cliente",
  name: "Cliente Prueba",
  email: "cliente@example.com",
  role: "CUSTOMER",
  isActive: true,
  createdAt: "2026-09-01T10:00:00.000Z",
  address: {
    recipient: null,
    phone: "999888777",
    street: "Av. Siempre Viva 742",
    reference: "Portón negro",
    district: "Miraflores",
    city: "Lima",
    region: null,
    postalCode: null,
  },
};

const sinDireccion: UsuarioDelPanel = {
  id: "u-otro",
  name: "Sin Dirección",
  email: "otro@example.com",
  role: "CUSTOMER",
  isActive: true,
  createdAt: "2026-09-02T10:00:00.000Z",
  address: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  sesion.user = duenio;
  listar.mockResolvedValue({
    total: 2,
    porRol: { CUSTOMER: 2, ADMIN: 0, SUPERADMIN: 1 },
    usuarios: [cliente, sinDireccion],
  });
  pedir.mockResolvedValue({ confirmacionId: "conf-1", correoEnviado: true });
});

describe("AdminUsersView: lo que se ve", () => {
  it("muestra el conteo y la dirección de cada uno", async () => {
    render(<AdminUsersView />);

    expect(await screen.findByText("Cliente Prueba")).toBeInTheDocument();
    expect(screen.getByText(/Av. Siempre Viva 742, Miraflores, Lima/)).toBeInTheDocument();
    expect(screen.getByText(/Todavía no cargó una dirección/)).toBeInTheDocument();
  });

  it("filtrar por rol vuelve a pedir la lista con ese rol", async () => {
    const user = userEvent.setup();
    render(<AdminUsersView />);
    await screen.findByText("Cliente Prueba");

    await user.click(screen.getByRole("button", { name: "Clientes" }));

    await waitFor(() => expect(listar).toHaveBeenCalledWith("un-token", "CUSTOMER"));
  });
});

describe("AdminUsersView: un admin común", () => {
  beforeEach(() => {
    sesion.user = { ...duenio, role: "ADMIN" };
  });

  // Ve para trabajar, pero no toca nada.
  it("ve la lista y la dirección, sin ninguna acción", async () => {
    render(<AdminUsersView />);
    await screen.findByText("Cliente Prueba");

    expect(screen.getByText(/Av. Siempre Viva 742/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Suspender" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Eliminar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Invitar" })).toBeNull();
  });
});

describe("AdminUsersView: confirmación por código", () => {
  async function abrirSuspension() {
    const user = userEvent.setup();
    render(<AdminUsersView />);
    await screen.findByText("Cliente Prueba");
    await user.click(screen.getAllByRole("button", { name: "Suspender" })[0]!);
    return user;
  }

  it("suspender pide el código antes de tocar nada", async () => {
    await abrirSuspension();

    await waitFor(() => expect(pedir).toHaveBeenCalledWith("un-token"));
    expect(await screen.findByLabelText("Código")).toBeInTheDocument();
    // Todavía no se aplicó nada.
    expect(actualizar).not.toHaveBeenCalled();
  });

  it("con el código, la acción se ejecuta llevándolo consigo", async () => {
    const user = await abrirSuspension();
    actualizar.mockResolvedValue({ ...cliente, isActive: false });

    await user.type(await screen.findByLabelText("Código"), "123456");
    await user.click(screen.getByRole("button", { name: /Confirmar/ }));

    await waitFor(() => expect(actualizar).toHaveBeenCalledOnce());
    const [token, id, cambios, confirmacion] = actualizar.mock.calls[0]!;
    expect(token).toBe("un-token");
    expect(id).toBe("u-cliente");
    expect(cambios).toEqual({ isActive: false });
    expect(confirmacion).toEqual({ confirmacionId: "conf-1", codigo: "123456" });
  });

  it("si el código está mal, el error se ve en el diálogo y sigue abierto", async () => {
    const user = await abrirSuspension();
    actualizar.mockRejectedValue(new Error("Código inválido"));

    await user.type(await screen.findByLabelText("Código"), "000000");
    await user.click(screen.getByRole("button", { name: /Confirmar/ }));

    expect(await screen.findByText("Código inválido")).toBeInTheDocument();
    expect(screen.getByLabelText("Código")).toBeInTheDocument();
  });

  it("cancelar cierra sin ejecutar", async () => {
    const user = await abrirSuspension();
    await screen.findByLabelText("Código");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText("Código")).toBeNull();
    expect(actualizar).not.toHaveBeenCalled();
  });

  it("no deja confirmar con un código incompleto", async () => {
    const user = await abrirSuspension();
    await user.type(await screen.findByLabelText("Código"), "123");

    expect(screen.getByRole("button", { name: /Confirmar/ })).toBeDisabled();
  });

  it("avisa si el servidor no pudo mandar el código", async () => {
    pedir.mockResolvedValue({ confirmacionId: "conf-1", correoEnviado: false });
    await abrirSuspension();

    expect(await screen.findByText(/quedó en su registro/)).toBeInTheDocument();
  });

  it("eliminar también pasa por el código", async () => {
    const user = userEvent.setup();
    render(<AdminUsersView />);
    await screen.findByText("Cliente Prueba");
    eliminar.mockResolvedValue(undefined);

    await user.click(screen.getAllByRole("button", { name: "Eliminar" })[0]!);
    await user.type(await screen.findByLabelText("Código"), "123456");
    await user.click(screen.getByRole("button", { name: /Confirmar/ }));

    await waitFor(() => expect(eliminar).toHaveBeenCalledOnce());
    expect(eliminar.mock.calls[0]![2]).toEqual({ confirmacionId: "conf-1", codigo: "123456" });
  });

  // Reenviar no cambia nada de la cuenta, asi que no molesta con un codigo.
  it("reenviar el acceso no pide código", async () => {
    const user = userEvent.setup();
    listar.mockResolvedValue({
      total: 1,
      porRol: { CUSTOMER: 0, ADMIN: 1, SUPERADMIN: 1 },
      usuarios: [{ ...cliente, role: "ADMIN" as const }],
    });
    reenviar.mockResolvedValue({ correoEnviado: true });
    render(<AdminUsersView />);

    await user.click(await screen.findByRole("button", { name: "Reenviar acceso" }));

    await waitFor(() => expect(reenviar).toHaveBeenCalledOnce());
    expect(pedir).not.toHaveBeenCalled();
  });
});
