import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckoutView } from "@/components/organisms/CheckoutView";
import { guardarCarrito, vaciar } from "@/lib/carrito-local";
import type { DatosDeCobro } from "@/lib/types";

const { api, sesion } = vi.hoisted(() => ({
  api: {
    obtenerDatosDeCobro: vi.fn(),
    hacerPedido: vi.fn(),
    getCart: vi.fn(),
    subirVoucher: vi.fn(),
  },
  sesion: { user: null as { name: string; email: string } | null, accessToken: null as string | null },
}));

vi.mock("@/lib/pago-api", () => ({
  obtenerDatosDeCobro: api.obtenerDatosDeCobro,
  hacerPedido: api.hacerPedido,
}));
vi.mock("@/lib/cart-api", () => ({ getCart: api.getCart }));
vi.mock("@/lib/voucher-api", () => ({ subirVoucher: api.subirVoucher }));
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ ...sesion, loading: false }),
}));
vi.mock("@/lib/cart-context", () => ({ useCart: () => ({ refresh: vi.fn(), itemCount: 1 }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const COBRO: DatosDeCobro = {
  titular: "Henrry Pérez",
  yape: "925064242",
  banco: "BCP",
  cuenta: "19103537229057",
  cci: "00219110353722905752",
  metodos: ["YAPE", "TRANSFERENCIA"],
  entregas: ["RECOJO", "DELIVERY"],
  costoDelivery: "12.00",
  motivo: null,
};

const PRODUCTO = {
  productId: "p1",
  slug: "oud-real",
  name: "Oud Real",
  price: "100.00",
  offerPrice: null,
  image: null,
  quantity: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  sesion.user = null;
  sesion.accessToken = null;
  api.obtenerDatosDeCobro.mockResolvedValue(COBRO);
  api.hacerPedido.mockResolvedValue({
    order: { id: "5e24fa01-x", status: "PENDING", total: "100.00", correo: "ana@gmail.com" },
    whatsappUrl: "https://wa.me/51988333444?text=hola",
  });
  guardarCarrito([PRODUCTO]);
});

afterEach(() => vaciar());

async function completarDatos() {
  await userEvent.type(screen.getByPlaceholderText("Nombre y apellidos"), "Ana Torres");
  await userEvent.type(screen.getByPlaceholderText("9XX XXX XXX"), "999111222");
  await userEvent.type(screen.getByPlaceholderText("70123456"), "70123456");
  await userEvent.type(screen.getByPlaceholderText("nombre@correo.com"), "ana@gmail.com");
}

describe("comprar sin cuenta", () => {
  it("muestra los productos del carrito del navegador", async () => {
    render(<CheckoutView />);

    expect(await screen.findByText("Oud Real")).toBeInTheDocument();
  });

  // El carrito del navegador no existe para el servidor: los productos tienen
  // que viajar en el pedido o no se compra nada.
  it("manda los productos junto con el pedido", async () => {
    render(<CheckoutView />);
    await screen.findByText("Oud Real");
    await completarDatos();

    await userEvent.click(screen.getByRole("button", { name: /Hacer el pedido/ }));

    await waitFor(() => expect(api.hacerPedido).toHaveBeenCalled());
    const [pedido, token] = api.hacerPedido.mock.calls[0]!;
    expect(pedido.items).toEqual([{ productId: "p1", quantity: 1 }]);
    expect(token).toBeNull();
  });

  it("deja el carrito vacío después de pedir", async () => {
    render(<CheckoutView />);
    await screen.findByText("Oud Real");
    await completarDatos();

    await userEvent.click(screen.getByRole("button", { name: /Hacer el pedido/ }));

    await waitFor(() => expect(screen.getByText(/registrado/)).toBeInTheDocument());
    expect(localStorage.getItem("lc-fragance:carrito")).toBeNull();
  });
});

describe("comprar con cuenta", () => {
  beforeEach(() => {
    sesion.user = { name: "Ana Torres", email: "ana@cuenta.com" };
    sesion.accessToken = "un-token";
    api.getCart.mockResolvedValue({
      items: [{ productId: "p1", quantity: 2, product: { name: "Oud Real", price: "100.00" } }],
    });
  });

  // Ya dimos esos datos de alta: volver a pedirlos es trabajo de más.
  it("trae el nombre y el correo de la cuenta", async () => {
    render(<CheckoutView />);

    expect(await screen.findByDisplayValue("Ana Torres")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ana@cuenta.com")).toBeInTheDocument();
  });

  // El carrito vive en el servidor: mandar los productos sería redundante y
  // además dejaría al navegador eligiendo qué se compra.
  it("no manda los productos: ya están en el carrito guardado", async () => {
    render(<CheckoutView />);
    await screen.findByText(/Oud Real/);
    // El nombre y el correo vienen de la cuenta; el celular no lo guardamos
    // en la sesion, asi que se escribe igual.
    await userEvent.type(screen.getByPlaceholderText("9XX XXX XXX"), "999111222");
    await userEvent.type(screen.getByPlaceholderText("70123456"), "70123456");

    await userEvent.click(screen.getByRole("button", { name: /Hacer el pedido/ }));

    await waitFor(() => expect(api.hacerPedido).toHaveBeenCalled());
    const [pedido, token] = api.hacerPedido.mock.calls[0]!;
    expect(pedido.items).toBeUndefined();
    expect(token).toBe("un-token");
  });
});

describe("los datos de pago", () => {
  it("muestra el Yape y, al cambiar de pestaña, la cuenta", async () => {
    render(<CheckoutView />);
    expect(await screen.findByText("925064242")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Transferencia" }));

    expect(screen.getByText("19103537229057")).toBeInTheDocument();
    expect(screen.getByText("00219110353722905752")).toBeInTheDocument();
  });

  // Lo que pidió el dueño: sin datos cargados no se deja comprar.
  it("si la tienda no puede cobrar, no hay formulario", async () => {
    api.obtenerDatosDeCobro.mockResolvedValue({
      ...COBRO,
      motivo: "Estamos configurando los medios de pago.",
    });

    render(<CheckoutView />);

    expect(await screen.findByText(/configurando los medios de pago/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Hacer el pedido/ })).not.toBeInTheDocument();
  });

  it("solo ofrece los métodos que la tienda tiene activos", async () => {
    api.obtenerDatosDeCobro.mockResolvedValue({ ...COBRO, metodos: ["YAPE"] });

    render(<CheckoutView />);
    await screen.findByText("925064242");

    expect(screen.queryByRole("button", { name: "Transferencia" })).not.toBeInTheDocument();
  });
});

describe("el delivery", () => {
  it("suma el costo de envío al total", async () => {
    render(<CheckoutView />);
    await screen.findByText("Oud Real");

    await userEvent.click(screen.getByRole("button", { name: /Más opciones/ }));
    await userEvent.click(screen.getByRole("button", { name: "Delivery" }));

    // Aparece dos veces a proposito: como monto a pagar y en el resumen.
    expect(screen.getAllByText(/112[.,]00/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Envío/)).toBeInTheDocument();
  });

  it("pide la dirección recién cuando se elige delivery", async () => {
    render(<CheckoutView />);
    await screen.findByText("Oud Real");

    await userEvent.click(screen.getByRole("button", { name: /Más opciones/ }));
    expect(screen.queryByPlaceholderText(/Calle, número/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Delivery" }));
    expect(screen.getByPlaceholderText(/Calle, número/)).toBeInTheDocument();
  });
});

describe("el comprobante", () => {
  it("avisa si el archivo pesa de más", async () => {
    api.subirVoucher.mockRejectedValue(new Error("El archivo pesa 14 MB y el máximo es 10 MB."));
    render(<CheckoutView />);
    await screen.findByText("Oud Real");

    const archivo = new File(["x"], "voucher.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByLabelText(/Adjunta tu voucher/), archivo);

    expect(await screen.findByText(/el máximo es 10 MB/)).toBeInTheDocument();
  });

  it("manda el enlace del comprobante con el pedido", async () => {
    api.subirVoucher.mockResolvedValue("https://res.cloudinary.com/demo/v.jpg");
    render(<CheckoutView />);
    await screen.findByText("Oud Real");
    await completarDatos();

    const archivo = new File(["x"], "voucher.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByLabelText(/Adjunta tu voucher/), archivo);
    await screen.findByText(/Comprobante adjunto/);
    await userEvent.click(screen.getByRole("button", { name: /Hacer el pedido/ }));

    await waitFor(() => expect(api.hacerPedido).toHaveBeenCalled());
    expect(api.hacerPedido.mock.calls[0]![0].voucherUrl).toBe(
      "https://res.cloudinary.com/demo/v.jpg"
    );
  });
});

describe("después de pedir", () => {
  it("dice a qué correo le llega la confirmación", async () => {
    render(<CheckoutView />);
    await screen.findByText("Oud Real");
    await completarDatos();

    await userEvent.click(screen.getByRole("button", { name: /Hacer el pedido/ }));

    expect(await screen.findByText("ana@gmail.com")).toBeInTheDocument();
  });

  // El WhatsApp deja de ser el botón principal: queda como ayuda.
  it("el WhatsApp queda como consulta, no como paso obligatorio", async () => {
    render(<CheckoutView />);
    await screen.findByText("Oud Real");
    await completarDatos();

    await userEvent.click(screen.getByRole("button", { name: /Hacer el pedido/ }));

    expect(await screen.findByRole("link", { name: /Dudas/ })).toHaveAttribute(
      "href",
      "https://wa.me/51988333444?text=hola"
    );
  });
});

describe("el documento", () => {
  // El courier lo pide para entregar, asi que no se puede pedir sin el.
  it("viaja con el pedido", async () => {
    render(<CheckoutView />);
    await screen.findByText("Oud Real");
    await completarDatos();

    await userEvent.click(screen.getByRole("button", { name: /Hacer el pedido/ }));

    await waitFor(() => expect(api.hacerPedido).toHaveBeenCalled());
    expect(api.hacerPedido.mock.calls[0]![0].dni).toBe("70123456");
  });

  it("explica para qué se pide", async () => {
    render(<CheckoutView />);

    expect(await screen.findByText(/El courier lo pide/)).toBeInTheDocument();
  });
});
