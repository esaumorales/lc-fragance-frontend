import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ProductGrid } from "@/components/organisms/ProductGrid";
import type { Product } from "@/lib/types";

vi.mock("next/image", () => ({
  // El mock tiene que ser un <img> plano: la regla de next/image no aplica
  // aca, justamente estamos reemplazando el componente de Next.
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@iconify/react", () => ({
  Icon: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

const handlers: Record<string, (payload: unknown) => void> = {};
const mockSocket = {
  on: vi.fn((event: string, handler: (payload: unknown) => void) => {
    handlers[event] = handler;
  }),
  off: vi.fn(),
};

vi.mock("@/lib/socket", () => ({
  getSocket: () => mockSocket,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ accessToken: null, user: null, loading: false }),
}));

vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({ itemCount: 0, refresh: vi.fn() }),
}));

const product: Product = {
  id: "1",
  name: "Bleu de Fragance",
  slug: "bleu-de-fragance",
  description: "Una fragancia de ejemplo",
  price: "49.90",
  sku: "SKU-1",
  images: ["https://example.com/img.jpg"],
  model3dUrl: null,
  attributes: {},
  isActive: true,
  stock: 5,
  categoryId: "cat-1",
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("ProductGrid", () => {
  it("muestra un mensaje cuando no hay productos", () => {
    render(<ProductGrid products={[]} />);
    expect(screen.getByText("Todavía no hay productos cargados.")).toBeInTheDocument();
  });

  it("renderiza una tarjeta por producto", () => {
    render(<ProductGrid products={[product]} />);
    expect(screen.getByText("Bleu de Fragance")).toBeInTheDocument();
    expect(screen.getByText("$49.90")).toBeInTheDocument();
  });

  it("muestra 'Sin stock' cuando stock es 0", () => {
    render(<ProductGrid products={[{ ...product, stock: 0 }]} />);
    expect(screen.getByRole("button", { name: /Sin stock/ })).toBeDisabled();
  });

  it("actualiza el stock en vivo al recibir stock:updated por socket", () => {
    render(<ProductGrid products={[product]} />);
    expect(screen.getByText("5 disp.")).toBeInTheDocument();

    act(() => {
      handlers["stock:updated"]({ productId: "1", stock: 2 });
    });

    expect(screen.getByText("2 disp.")).toBeInTheDocument();
  });
});
