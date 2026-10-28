import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddToCartButton } from "@/components/molecules/AddToCartButton";
import { leerCarrito, vaciar } from "@/lib/carrito-local";

vi.mock("@iconify/react", () => ({
  Icon: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

const addCartItem = vi.fn();
vi.mock("@/lib/cart-api", () => ({
  addCartItem: (...args: unknown[]) => addCartItem(...args),
}));

let mockAccessToken: string | null = null;
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ accessToken: mockAccessToken }),
}));

const PRODUCTO = {
  productId: "p1",
  slug: "oud-real",
  name: "Oud Real",
  price: "120.00",
  offerPrice: null,
  image: null,
};

const cartRefresh = vi.fn();
vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({ itemCount: 0, refresh: cartRefresh }),
}));

afterEach(() => {
  vi.clearAllMocks();
  mockAccessToken = null;
  vaciar();
});

describe("AddToCartButton", () => {
  // Mandar al login acá perdía la venta de quien no se quería registrar.
  it("sin sesión, guarda el producto en el carrito del navegador", async () => {
    render(<AddToCartButton producto={PRODUCTO} stock={5} />);
    await userEvent.click(screen.getByRole("button"));

    expect(leerCarrito()).toEqual([{ ...PRODUCTO, quantity: 1 }]);
    expect(cartRefresh).toHaveBeenCalled();
    expect(addCartItem).not.toHaveBeenCalled();
  });

  it("agrega el producto al carrito cuando hay sesión", async () => {
    mockAccessToken = "token-123";
    addCartItem.mockResolvedValue({});

    render(<AddToCartButton producto={PRODUCTO} stock={5} />);
    await userEvent.click(screen.getByRole("button"));

    expect(addCartItem).toHaveBeenCalledWith("token-123", "p1", 1);
    await waitFor(() => expect(screen.getByText("Agregado")).toBeInTheDocument());
  });

  it("se deshabilita cuando no hay stock", () => {
    render(<AddToCartButton producto={PRODUCTO} stock={0} />);
    expect(screen.getByRole("button", { name: /Sin stock/ })).toBeDisabled();
  });
});
