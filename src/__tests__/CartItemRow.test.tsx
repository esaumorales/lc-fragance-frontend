import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartItemRow } from "@/components/molecules/CartItemRow";
import type { CartItem } from "@/lib/types";
import { precio } from "@/lib/precio";

vi.mock("next/image", () => ({
  // El mock tiene que ser un <img> plano: la regla de next/image no aplica
  // aca, justamente estamos reemplazando el componente de Next.
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

vi.mock("@iconify/react", () => ({
  Icon: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

const item: CartItem = {
  id: "item-1",
  productId: "p1",
  quantity: 2,
  product: {
    id: "p1",
    name: "Bleu Nocturne",
    slug: "bleu-nocturne",
    description: "",
    price: "50",
    sku: "SKU-1",
    stock: 10,
    images: [],
    model3dUrl: null,
    attributes: {},
    isActive: true,
    categoryId: "cat-1",
  },
};

describe("CartItemRow", () => {
  it("muestra el subtotal correcto", () => {
    render(
      <CartItemRow item={item} onQuantityChange={vi.fn()} onRemove={vi.fn()} disabled={false} />
    );
    expect(screen.getByText(precio("100.00"))).toBeInTheDocument();
  });

  it("llama a onQuantityChange al aumentar la cantidad", async () => {
    const onQuantityChange = vi.fn();
    render(
      <CartItemRow
        item={item}
        onQuantityChange={onQuantityChange}
        onRemove={vi.fn()}
        disabled={false}
      />
    );

    await userEvent.click(screen.getByLabelText("Aumentar cantidad"));

    expect(onQuantityChange).toHaveBeenCalledWith("p1", 3);
  });

  it("llama a onRemove al hacer click en quitar", async () => {
    const onRemove = vi.fn();
    render(
      <CartItemRow item={item} onQuantityChange={vi.fn()} onRemove={onRemove} disabled={false} />
    );

    await userEvent.click(screen.getByLabelText("Quitar del carrito"));

    expect(onRemove).toHaveBeenCalledWith("p1");
  });

  it("deshabilita el botón de aumentar cuando la cantidad llega al stock", () => {
    render(
      <CartItemRow
        item={{ ...item, quantity: 10 }}
        onQuantityChange={vi.fn()}
        onRemove={vi.fn()}
        disabled={false}
      />
    );
    expect(screen.getByLabelText("Aumentar cantidad")).toBeDisabled();
  });
});
