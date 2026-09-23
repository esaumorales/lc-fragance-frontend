import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddToCartButton } from "@/components/molecules/AddToCartButton";

vi.mock("@iconify/react", () => ({
  Icon: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const addCartItem = vi.fn();
vi.mock("@/lib/cart-api", () => ({
  addCartItem: (...args: unknown[]) => addCartItem(...args),
}));

let mockAccessToken: string | null = null;
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ accessToken: mockAccessToken }),
}));

const cartRefresh = vi.fn();
vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({ itemCount: 0, refresh: cartRefresh }),
}));

afterEach(() => {
  vi.clearAllMocks();
  mockAccessToken = null;
});

describe("AddToCartButton", () => {
  it("redirige a /login si no hay sesión", async () => {
    render(<AddToCartButton productId="p1" stock={5} />);
    await userEvent.click(screen.getByRole("button"));

    expect(push).toHaveBeenCalledWith("/login");
    expect(addCartItem).not.toHaveBeenCalled();
  });

  it("agrega el producto al carrito cuando hay sesión", async () => {
    mockAccessToken = "token-123";
    addCartItem.mockResolvedValue({});

    render(<AddToCartButton productId="p1" stock={5} />);
    await userEvent.click(screen.getByRole("button"));

    expect(addCartItem).toHaveBeenCalledWith("token-123", "p1", 1);
    await waitFor(() => expect(screen.getByText("Agregado")).toBeInTheDocument());
  });

  it("se deshabilita cuando no hay stock", () => {
    render(<AddToCartButton productId="p1" stock={0} />);
    expect(screen.getByRole("button", { name: /Sin stock/ })).toBeDisabled();
  });
});
