import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PerfilView } from "@/components/organisms/PerfilView";
import type { AuthUser } from "@/lib/types";

vi.mock("@iconify/react", () => ({ Icon: ({ icon }: { icon: string }) => <span data-icon={icon} /> }));

const {
  sesion,
  actualizarUsuario,
  reemplazarSesion,
  actualizarPerfil,
  cambiarClave,
  verDireccion,
  guardarDireccion,
  replace,
} = vi.hoisted(() => ({
  sesion: { user: null as AuthUser | null, loading: false },
  actualizarUsuario: vi.fn(),
  reemplazarSesion: vi.fn(),
  actualizarPerfil: vi.fn(),
  cambiarClave: vi.fn(),
  verDireccion: vi.fn(),
  guardarDireccion: vi.fn(),
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
  verDireccionRequest: verDireccion,
  guardarDireccionRequest: guardarDireccion,
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
  verDireccion.mockResolvedValue({ direccion: null });
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
    await user.click(screen.getByRole("tab", { name: /Seguridad/ }));
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

describe("PerfilView: secciones", () => {
  it("arranca en Datos y no muestra las otras", () => {
    render(<PerfilView />);

    expect(screen.getByRole("tab", { name: /Datos/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.queryByLabelText("Contraseña actual")).toBeNull();
    expect(screen.queryByLabelText("Calle y número")).toBeNull();
  });

  it("cambia a Seguridad", async () => {
    const user = userEvent.setup();
    render(<PerfilView />);
    await user.click(screen.getByRole("tab", { name: /Seguridad/ }));

    expect(screen.getByLabelText("Contraseña actual")).toBeVisible();
    // Sigue montado para no perder lo escrito, pero oculto.
    expect(screen.getByLabelText("Nombre")).not.toBeVisible();
  });

  it("cambia a Dirección y pide la guardada", async () => {
    const user = userEvent.setup();
    render(<PerfilView />);
    await user.click(screen.getByRole("tab", { name: /Dirección/ }));

    expect(await screen.findByLabelText("Calle y número")).toBeInTheDocument();
    expect(verDireccion).toHaveBeenCalledWith("un-token");
  });
});

describe("PerfilView: dirección", () => {
  async function abrirDireccion() {
    const user = userEvent.setup();
    render(<PerfilView />);
    await user.click(screen.getByRole("tab", { name: /Dirección/ }));
    await screen.findByLabelText("Calle y número");
    return user;
  }

  it("rellena los campos con la dirección ya cargada", async () => {
    verDireccion.mockResolvedValue({
      direccion: {
        recipient: "Esau Morales",
        phone: "999888777",
        street: "Av. Siempre Viva 742",
        reference: "Portón negro",
        district: "Miraflores",
        city: "Lima",
        region: null,
        postalCode: null,
        latitude: null,
        longitude: null,
      },
    });
    await abrirDireccion();

    expect(screen.getByLabelText("Calle y número")).toHaveValue("Av. Siempre Viva 742");
    expect(screen.getByLabelText("Distrito")).toHaveValue("Miraflores");
    expect(screen.getByLabelText("Teléfono")).toHaveValue("999888777");
    // Los nulos se muestran vacíos, no como "null".
    expect(screen.getByLabelText("Región")).toHaveValue("");
  });

  it("guarda la dirección cargada a mano", async () => {
    const user = await abrirDireccion();
    guardarDireccion.mockResolvedValue({
      direccion: {
        recipient: null,
        phone: null,
        street: "Jr. Union 123",
        reference: null,
        district: "Cercado",
        city: "Lima",
        region: null,
        postalCode: null,
        latitude: null,
        longitude: null,
      },
    });

    await user.type(screen.getByLabelText("Calle y número"), "Jr. Union 123");
    await user.type(screen.getByLabelText("Distrito"), "Cercado");
    await user.type(screen.getByLabelText("Ciudad"), "Lima");
    await user.click(screen.getByRole("button", { name: "Guardar dirección" }));

    await waitFor(() => expect(guardarDireccion).toHaveBeenCalledOnce());
    const [token, datos] = guardarDireccion.mock.calls[0]!;
    expect(token).toBe("un-token");
    expect(datos).toMatchObject({ street: "Jr. Union 123", district: "Cercado", city: "Lima" });
  });

  it("avisa si el servidor rechaza la dirección", async () => {
    const user = await abrirDireccion();
    guardarDireccion.mockRejectedValue(new Error("La calle es muy corta"));

    await user.type(screen.getByLabelText("Calle y número"), "Jr. Union 123");
    await user.type(screen.getByLabelText("Distrito"), "Cercado");
    await user.type(screen.getByLabelText("Ciudad"), "Lima");
    await user.click(screen.getByRole("button", { name: "Guardar dirección" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("La calle es muy corta");
  });
});

describe("PerfilView: no recarga al volver a una sección", () => {
  it("pide la dirección una sola vez aunque se cambie de pestaña y se vuelva", async () => {
    const user = userEvent.setup();
    render(<PerfilView />);

    await user.click(screen.getByRole("tab", { name: /Dirección/ }));
    await screen.findByLabelText("Calle y número");
    expect(verDireccion).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("tab", { name: /Datos/ }));
    await user.click(screen.getByRole("tab", { name: /Dirección/ }));

    // Si el panel se desmontara, esto seria 2 y se veria un "Cargando".
    expect(verDireccion).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Calle y número")).toBeInTheDocument();
  });

  it("conserva lo escrito al ir y volver", async () => {
    const user = userEvent.setup();
    render(<PerfilView />);

    await user.click(screen.getByRole("tab", { name: /Dirección/ }));
    await user.type(await screen.findByLabelText("Ciudad"), "Arequipa");

    await user.click(screen.getByRole("tab", { name: /Seguridad/ }));
    await user.click(screen.getByRole("tab", { name: /Dirección/ }));

    expect(screen.getByLabelText("Ciudad")).toHaveValue("Arequipa");
  });

  // No se pide antes de que la abran por primera vez.
  it("no pide la dirección si nunca se abre esa pestaña", async () => {
    render(<PerfilView />);
    await screen.findByLabelText("Nombre");

    expect(verDireccion).not.toHaveBeenCalled();
  });
});

describe("PerfilView: el punto del mapa", () => {
  it("guarda la dirección con el punto en null si no se marcó ninguno", async () => {
    const user = userEvent.setup();
    render(<PerfilView />);
    await user.click(screen.getByRole("tab", { name: /Dirección/ }));
    await screen.findByLabelText("Calle y número");

    guardarDireccion.mockResolvedValue({
      direccion: {
        recipient: null,
        phone: null,
        street: "Jr. Union 123",
        reference: null,
        district: "Cercado",
        city: "Lima",
        region: null,
        postalCode: null,
        latitude: null,
        longitude: null,
      },
    });

    await user.type(screen.getByLabelText("Calle y número"), "Jr. Union 123");
    await user.type(screen.getByLabelText("Distrito"), "Cercado");
    await user.type(screen.getByLabelText("Ciudad"), "Lima");
    await user.click(screen.getByRole("button", { name: "Guardar dirección" }));

    await waitFor(() => expect(guardarDireccion).toHaveBeenCalledOnce());
    const [, datos] = guardarDireccion.mock.calls[0]!;
    expect(datos.latitude).toBeNull();
    expect(datos.longitude).toBeNull();
  });

  it("muestra el punto guardado cuando la dirección ya tiene coordenadas", async () => {
    verDireccion.mockResolvedValue({
      direccion: {
        recipient: null,
        phone: null,
        street: "Jr. Union 123",
        reference: null,
        district: "Cercado",
        city: "Lima",
        region: null,
        postalCode: null,
        latitude: -12.0464,
        longitude: -77.0428,
      },
    });
    const user = userEvent.setup();
    render(<PerfilView />);
    await user.click(screen.getByRole("tab", { name: /Dirección/ }));

    expect(await screen.findByText(/-12\.04640, -77\.04280/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Quitar punto/ })).toBeInTheDocument();
  });
});
