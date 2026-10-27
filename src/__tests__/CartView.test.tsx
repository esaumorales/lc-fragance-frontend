import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartView } from "@/components/organisms/CartView";
import type { Cart, CheckoutResult } from "@/lib/types";

const { api } = vi.hoisted(() => ({
  api: {
    getCart: vi.fn(),
    checkout: vi.fn(),
    updateCartItem: vi.fn(),
    removeCartItem: vi.fn(),
  },
}));

vi.mock("@/lib/cart-api", () => api);
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { id: "u1", name: "Ana" }, accessToken: "token", loading: false }),
}));
vi.mock("@/lib/cart-context", () => ({ useCart: () => ({ refresh: vi.fn(), count: 1 }) }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

const carrito = {
  id: "cart-1",
  items: [
    {
      id: "i1",
      productId: "p1",
      quantity: 1,
      product: {
        id: "p1",
        name: "Velvet Musk",
        slug: "velvet-musk",
        description: "",
        price: "74.50",
        sku: "S-1",
        stock: 5,
        images: [],
        model3dUrl: null,
        attributes: {},
        isActive: true,
        categoryId: "c1",
      },
    },
  ],
} as unknown as Cart;

function resultado(yape: { name: string; phone: string }): CheckoutResult {
  return {
    order: { id: "5e24fa01-aaaa-bbbb-cccc-dddddddddddd", status: "PENDING", total: "74.50" },
    whatsappUrl: "https://wa.me/51988333444?text=Hola%2C%20quiero%20este%20producto%3A",
    yape,
  } as unknown as CheckoutResult;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getCart.mockResolvedValue(carrito);
});

async function confirmar() {
  render(<CartView />);
  await waitFor(() => expect(screen.getByRole("button", { name: /pedido/i })).toBeEnabled());
  await userEvent.click(screen.getByRole("button", { name: /pedido/i }));
}

describe("después de hacer el pedido", () => {
  it("el botón lleva al WhatsApp con el pedido ya escrito", async () => {
    api.checkout.mockResolvedValue(resultado({ name: "LC Fragance", phone: "999888777" }));

    await confirmar();

    const enlace = await screen.findByRole("link", { name: /lo quiero/i });
    expect(enlace).toHaveAttribute("href", expect.stringContaining("wa.me/51988333444"));
    expect(decodeURIComponent(enlace.getAttribute("href") ?? "")).toContain("quiero este producto");
  });

  it("muestra el número del Yape cuando está configurado", async () => {
    api.checkout.mockResolvedValue(resultado({ name: "LC Fragance", phone: "999888777" }));

    await confirmar();

    expect(await screen.findByText("999888777")).toBeInTheDocument();
  });

  // Sin número quedaba un "al ." colgando en medio de la frase.
  it("no deja la frase cortada si no hay número de Yape", async () => {
    api.checkout.mockResolvedValue(resultado({ name: "LC Fragance", phone: "" }));

    await confirmar();

    const paso = await screen.findByText(/Yapeá/);
    expect(paso.textContent).not.toMatch(/al\s*\./);
    expect(paso.textContent).toContain("LC Fragance");
  });

  it("no le pide el comprobante a quien compra", async () => {
    api.checkout.mockResolvedValue(resultado({ name: "LC Fragance", phone: "999888777" }));

    await confirmar();

    expect(await screen.findByText(/No hace falta que mandes el comprobante/)).toBeInTheDocument();
  });
});
