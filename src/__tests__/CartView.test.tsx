import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartView } from "@/components/organisms/CartView";
import { guardarCarrito, leerCarrito, vaciar } from "@/lib/carrito-local";

const { api, sesion } = vi.hoisted(() => ({
  api: { getCart: vi.fn(), updateCartItem: vi.fn(), removeCartItem: vi.fn() },
  sesion: { accessToken: null as string | null },
}));

vi.mock("@/lib/cart-api", () => api);
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ ...sesion, loading: false }) }));
vi.mock("@/lib/cart-context", () => ({ useCart: () => ({ refresh: vi.fn(), itemCount: 1 }) }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

const PRODUCTO = {
  productId: "p1",
  slug: "oud-real",
  name: "Oud Real",
  price: "100.00",
  offerPrice: null,
  image: null,
  quantity: 2,
};

beforeEach(() => {
  vi.clearAllMocks();
  sesion.accessToken = null;
  vaciar();
});

afterEach(() => vaciar());

describe("el carrito de quien no tiene cuenta", () => {
  // Antes esta pantalla mandaba al login: se perdía la venta de quien no se
  // quería registrar.
  it("muestra lo que hay guardado en el navegador", async () => {
    guardarCarrito([PRODUCTO]);

    render(<CartView />);

    expect(await screen.findByText("Oud Real")).toBeInTheDocument();
    expect(api.getCart).not.toHaveBeenCalled();
  });

  it("cambiar la cantidad queda guardado", async () => {
    guardarCarrito([PRODUCTO]);
    render(<CartView />);
    await screen.findByText("Oud Real");

    await userEvent.click(screen.getByRole("button", { name: /aumentar/i }));

    await waitFor(() => expect(leerCarrito()[0]!.quantity).toBe(3));
  });

  it("quitar el producto lo saca de lo guardado", async () => {
    guardarCarrito([PRODUCTO]);
    render(<CartView />);
    await screen.findByText("Oud Real");

    await userEvent.click(screen.getByRole("button", { name: /quitar/i }));

    await waitFor(() => expect(leerCarrito()).toEqual([]));
  });

  it("avisa que se puede comprar sin crear cuenta", async () => {
    guardarCarrito([PRODUCTO]);

    render(<CartView />);

    expect(await screen.findByText(/sin crear una cuenta/)).toBeInTheDocument();
  });
});

describe("el carrito de quien tiene cuenta", () => {
  beforeEach(() => {
    sesion.accessToken = "un-token";
    api.getCart.mockResolvedValue({
      items: [
        {
          id: "i1",
          productId: "p1",
          quantity: 2,
          product: { id: "p1", name: "Oud Real", slug: "oud-real", price: "100.00", images: [] },
        },
      ],
    });
  });

  it("lo trae del servidor", async () => {
    render(<CartView />);

    expect(await screen.findByText("Oud Real")).toBeInTheDocument();
    expect(api.getCart).toHaveBeenCalledWith("un-token");
  });

  it("no ofrece crear cuenta: ya tiene una", async () => {
    render(<CartView />);
    await screen.findByText("Oud Real");

    expect(screen.queryByText(/sin crear una cuenta/)).not.toBeInTheDocument();
  });
});

describe("el total y el paso siguiente", () => {
  it("suma lo que cuesta cada renglón", async () => {
    guardarCarrito([PRODUCTO]);

    render(<CartView />);

    expect(await screen.findByText(/Total: .*200[.,]00/)).toBeInTheDocument();
  });

  // El pago ahora vive en su propia pantalla.
  it("lleva al checkout", async () => {
    guardarCarrito([PRODUCTO]);

    render(<CartView />);

    expect(await screen.findByRole("link", { name: /Continuar al pago/ })).toHaveAttribute(
      "href",
      "/checkout"
    );
  });

  it("sin nada adentro, no ofrece pagar", async () => {
    render(<CartView />);

    expect(await screen.findByText(/carrito está vacío/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Continuar al pago/ })).not.toBeInTheDocument();
  });
});
