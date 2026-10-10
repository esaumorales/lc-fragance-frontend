import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Icon } from "@/components/atoms/Icon";

// El doble de @iconify/react vive en vitest.setup.tsx, para todas las pruebas.

describe("Icon", () => {
  it("pasa el nombre del icono a @iconify/react", () => {
    const { container } = render(<Icon icon="mdi:cart-outline" />);
    expect(container.querySelector('[data-icon="mdi:cart-outline"]')).toBeInTheDocument();
  });

  it("combina la clase por defecto con la clase recibida", () => {
    const { container } = render(<Icon icon="mdi:cart-outline" className="text-red-500" />);
    const el = container.querySelector('[data-icon="mdi:cart-outline"]');
    expect(el).toHaveClass("h-5", "w-5", "text-red-500");
  });
});
