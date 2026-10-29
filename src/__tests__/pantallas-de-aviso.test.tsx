import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NoEncontrada from "@/app/not-found";
import Error from "@/app/error";

vi.mock("@/components/templates/CatalogLayout", () => ({
  CatalogLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("la página 404", () => {
  it("dice que la página no existe", () => {
    render(<NoEncontrada />);

    expect(screen.getByRole("heading", { name: /no existe/i })).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  // Un callejón sin salida hace que la persona cierre la pestaña.
  it("ofrece a dónde ir", () => {
    render(<NoEncontrada />);

    expect(screen.getByRole("link", { name: /Volver al inicio/ })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /Ver la colección/ })).toHaveAttribute(
      "href",
      "/perfumes"
    );
  });

  // Reintentar no arregla una dirección mal escrita.
  it("no ofrece reintentar", () => {
    render(<NoEncontrada />);

    expect(screen.queryByRole("button", { name: /Reintentar/ })).not.toBeInTheDocument();
  });
});

describe("la pantalla de error", () => {
  const fallo = Object.assign(new globalThis.Error("502"), { digest: "abc123" });

  // Es lo que se ve cuando la API no contesta: decir "no existe" sería mentir.
  it("dice que no se pudo cargar, no que no exista", () => {
    render(<Error error={fallo} reset={vi.fn()} />);

    expect(screen.getByRole("heading", { name: /No pudimos cargar/ })).toBeInTheDocument();
    expect(screen.queryByText("404")).not.toBeInTheDocument();
  });

  it("deja reintentar, porque esto sí se puede resolver solo", async () => {
    const reintentar = vi.fn();
    render(<Error error={fallo} reset={reintentar} />);

    await userEvent.click(screen.getByRole("button", { name: /Reintentar/ }));

    expect(reintentar).toHaveBeenCalled();
  });

  // Con la referencia, un reporte deja de ser "no me carga".
  it("muestra la referencia del error cuando la hay", () => {
    render(<Error error={fallo} reset={vi.fn()} />);

    expect(screen.getByText(/abc123/)).toBeInTheDocument();
  });

  it("sin referencia no inventa una", () => {
    render(<Error error={new globalThis.Error("x")} reset={vi.fn()} />);

    expect(screen.queryByText(/Referencia/)).not.toBeInTheDocument();
  });

  // Averiguar qué falló no puede obligar a reproducirlo.
  it("deja el error en la consola", () => {
    render(<Error error={fallo} reset={vi.fn()} />);

    expect(console.error).toHaveBeenCalledWith(fallo);
  });
});
