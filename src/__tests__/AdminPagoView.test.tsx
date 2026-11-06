import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminPagoView } from "@/components/organisms/AdminPagoView";
import type { ConfiguracionDePago } from "@/lib/types";

const { api } = vi.hoisted(() => ({
  api: {
    obtenerConfiguracion: vi.fn(),
    guardarConfiguracion: vi.fn(),
    borrarConfiguracion: vi.fn(),
  },
}));

vi.mock("@/lib/pago-api", () => api);
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ accessToken: "un-token", loading: false }),
}));

const CONFIG: ConfiguracionDePago = {
  titular: "Henrry Pérez",
  yape: "925064242",
  banco: "BCP",
  cuenta: "19103537229057",
  cci: "00219110353722905752",
  whatsapp: "+51 974 732 528",
  correoDeAvisos: "tienda@example.com",
  recojoActivo: true,
  deliveryActivo: true,
  costoDelivery: "12.00",
};

beforeEach(() => {
  vi.clearAllMocks();
  api.obtenerConfiguracion.mockResolvedValue(CONFIG);
  api.guardarConfiguracion.mockResolvedValue(CONFIG);
  api.borrarConfiguracion.mockResolvedValue({
    ...CONFIG,
    titular: null,
    yape: null,
    banco: null,
    cuenta: null,
    cci: null,
  });
});

describe("lo que se carga", () => {
  it("trae los datos que ya estaban guardados", async () => {
    render(<AdminPagoView />);

    expect(await screen.findByDisplayValue("925064242")).toBeInTheDocument();
    expect(screen.getByDisplayValue("19103537229057")).toBeInTheDocument();
    expect(screen.getByDisplayValue("tienda@example.com")).toBeInTheDocument();
  });
});

describe("guardar", () => {
  // El fallo que llegó a producción: un <input type="number"> devuelve "12",
  // no 12, y el backend lo rechazaba con "Expected number, received string".
  it("manda el costo del delivery como número, no como texto", async () => {
    render(<AdminPagoView />);
    await screen.findByDisplayValue("925064242");

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(api.guardarConfiguracion).toHaveBeenCalled());
    const [, cambios] = api.guardarConfiguracion.mock.calls[0]!;
    expect(typeof cambios.costoDelivery).toBe("number");
    expect(cambios.costoDelivery).toBe(12);
  });

  it("un costo editado también viaja como número", async () => {
    render(<AdminPagoView />);
    const costo = await screen.findByLabelText("Costo del delivery");

    await userEvent.clear(costo);
    await userEvent.type(costo, "8.5");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(api.guardarConfiguracion).toHaveBeenCalled());
    expect(api.guardarConfiguracion.mock.calls[0]![1].costoDelivery).toBe(8.5);
  });

  // Vaciar el campo no puede mandar NaN: el backend lo rechazaría igual.
  it("el campo vacío vale cero, no NaN", async () => {
    render(<AdminPagoView />);
    const costo = await screen.findByLabelText("Costo del delivery");

    await userEvent.clear(costo);
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(api.guardarConfiguracion).toHaveBeenCalled());
    expect(api.guardarConfiguracion.mock.calls[0]![1].costoDelivery).toBe(0);
  });

  it("avisa cuando quedó guardado", async () => {
    render(<AdminPagoView />);
    await screen.findByDisplayValue("925064242");

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Guardado.")).toBeInTheDocument();
  });

  it("muestra el motivo si el backend lo rechaza", async () => {
    api.guardarConfiguracion.mockRejectedValue(new Error("Revisa los datos ingresados"));
    render(<AdminPagoView />);
    await screen.findByDisplayValue("925064242");

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Revisa los datos ingresados")).toBeInTheDocument();
  });
});

describe("el aviso de que no se puede cobrar", () => {
  // Sin esto, el admin descubre que el checkout está bloqueado recién cuando
  // un cliente no puede comprar.
  it("aparece al borrar los datos de cobro", async () => {
    render(<AdminPagoView />);
    await screen.findByDisplayValue("925064242");

    await userEvent.click(screen.getByRole("button", { name: /Borrar los datos de cobro/ }));

    expect(await screen.findByText(/el checkout queda bloqueado/)).toBeInTheDocument();
  });

  it("aparece al apagar las dos entregas", async () => {
    render(<AdminPagoView />);
    await screen.findByDisplayValue("925064242");

    await userEvent.click(screen.getByRole("checkbox", { name: "Recojo en tienda" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Delivery" }));

    expect(await screen.findByText(/nadie puede comprar/)).toBeInTheDocument();
  });

  it("no aparece cuando está todo cargado", async () => {
    render(<AdminPagoView />);
    await screen.findByDisplayValue("925064242");

    expect(screen.queryByText(/checkout queda bloqueado/)).not.toBeInTheDocument();
  });
});

describe("el WhatsApp de atención", () => {
  // Antes salía del perfil de algún admin: el número público de la tienda
  // cambiaba solo cuando esa persona editaba su teléfono.
  it("se carga desde la configuración, no desde un perfil", async () => {
    render(<AdminPagoView />);

    expect(await screen.findByDisplayValue("+51 974 732 528")).toBeInTheDocument();
  });

  it("se guarda junto con el resto", async () => {
    render(<AdminPagoView />);
    const campo = await screen.findByLabelText("WhatsApp de atención");

    await userEvent.clear(campo);
    await userEvent.type(campo, "+51 999 111 222");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(api.guardarConfiguracion).toHaveBeenCalled());
    expect(api.guardarConfiguracion.mock.calls[0]![1].whatsapp).toBe("+51 999 111 222");
  });

  // Hay que avisar que sin número desaparece el botón, no dejar que lo
  // descubran cuando un cliente no puede escribir.
  it("avisa qué pasa si queda vacío", async () => {
    render(<AdminPagoView />);
    // Con número cargado se muestra el enlace; el aviso aparece al vaciarlo.
    await userEvent.clear(await screen.findByLabelText("WhatsApp de atención"));

    expect(await screen.findByText(/el botón de WhatsApp no aparece/)).toBeInTheDocument();
  });
});

describe("el número de WhatsApp mal escrito", () => {
  // El error fácil: poner el móvil local y olvidar el 51. Antes el campo lo
  // aceptaba, el botón aparecía y el enlace abría un chat con nadie.
  it("avisa que falta el código del país", async () => {
    render(<AdminPagoView />);
    const campo = await screen.findByLabelText("WhatsApp de atención");

    await userEvent.clear(campo);
    await userEvent.type(campo, "974732528");

    expect(await screen.findByText(/Falta el código del país/)).toBeInTheDocument();
  });

  it("no deja guardar mientras esté mal", async () => {
    render(<AdminPagoView />);
    const campo = await screen.findByLabelText("WhatsApp de atención");

    await userEvent.clear(campo);
    await userEvent.type(campo, "974732528");

    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    expect(api.guardarConfiguracion).not.toHaveBeenCalled();
  });

  // Ver el enlace mientras se escribe hace evidente el problema.
  it("muestra cómo va a quedar cuando está bien", async () => {
    render(<AdminPagoView />);
    const campo = await screen.findByLabelText("WhatsApp de atención");

    await userEvent.clear(campo);
    await userEvent.type(campo, "+51 974 732 528");

    expect(await screen.findByText("wa.me/51974732528")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
  });

  // Vacío es válido: el campo es opcional, solo que sin él no hay botón.
  it("vacío no se marca como error", async () => {
    render(<AdminPagoView />);
    const campo = await screen.findByLabelText("WhatsApp de atención");

    await userEvent.clear(campo);

    expect(screen.queryByText(/Falta el código/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
  });
});
