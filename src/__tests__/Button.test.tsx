import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/atoms/Button";

describe("Button", () => {
  it("renderiza el texto recibido", () => {
    render(<Button>Agregar al carrito</Button>);
    expect(screen.getByRole("button", { name: "Agregar al carrito" })).toBeInTheDocument();
  });

  it("llama a onClick al hacer click", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Comprar</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Comprar" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("se deshabilita cuando disabled=true", () => {
    render(<Button disabled>Sin stock</Button>);
    expect(screen.getByRole("button", { name: "Sin stock" })).toBeDisabled();
  });
});
