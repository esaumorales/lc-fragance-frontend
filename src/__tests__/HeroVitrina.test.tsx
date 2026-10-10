import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroVitrina } from "@/components/organisms/HeroVitrina";
import { PERFUMES_VITRINA } from "@/data/perfumes-vitrina";

const { movimiento } = vi.hoisted(() => ({ movimiento: { reducido: false } }));

beforeEach(() => {
  movimiento.reducido = false;
  // jsdom no trae matchMedia y sin ella el componente ni monta.
  window.matchMedia = vi.fn().mockImplementation((consulta: string) => ({
    matches: consulta.includes("reduce") && movimiento.reducido,
    media: consulta,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;

  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Al abrir, el scroll esta en cero: el centrado es el primero de la lista.
const PRIMERO = PERFUMES_VITRINA[0]!;

describe("lo que puede leer Google", () => {
  it("hay un solo h1 y es el de la marca", () => {
    render(<HeroVitrina />);
    const titulos = screen.getAllByRole("heading", { level: 1 });
    expect(titulos).toHaveLength(1);
    expect(titulos[0]).toHaveTextContent(/Una esencia/);
  });

  // El nombre y las notas de los nueve tienen que estar en el HTML, no solo
  // dibujados: lo unico que un buscador recibe de una imagen es su alt.
  it("cada frasco lleva su nombre y sus notas en el alternativo", () => {
    render(<HeroVitrina />);
    for (const perfume of PERFUMES_VITRINA) {
      expect(screen.getByRole("img", { name: `${perfume.nombre}, ${perfume.nota}` })).toBeInTheDocument();
    }
  });

  it("cada frasco abre su ficha", () => {
    render(<HeroVitrina />);
    for (const perfume of PERFUMES_VITRINA) {
      expect(screen.getByRole("button", { name: `Descubrir ${perfume.nombre}` })).toBeInTheDocument();
    }
  });

  // Es el elemento que mide el LCP: sale en el HTML inicial y con prioridad.
  it("el primer frasco se pide con prioridad alta y los demás no", () => {
    render(<HeroVitrina />);
    const primero = screen.getByRole("img", { name: `${PRIMERO.nombre}, ${PRIMERO.nota}` });
    expect(primero).toHaveAttribute("fetchpriority", "high");

    const otro = PERFUMES_VITRINA[1]!;
    expect(screen.getByRole("img", { name: `${otro.nombre}, ${otro.nota}` })).toHaveAttribute(
      "fetchpriority",
      "auto"
    );
  });

  it("la ficha muestra al primero antes de que nadie scrollee", () => {
    render(<HeroVitrina />);
    expect(screen.getByRole("heading", { level: 2, name: PRIMERO.nombre })).toBeInTheDocument();
  });
});

describe("el recorrido", () => {
  // Sin alto no hay scroll que recorrer y la fila nunca se mueve.
  it("la sección es más alta cuantos más perfumes hay", () => {
    const { container } = render(<HeroVitrina />);
    const seccion = container.querySelector("section.vitrina") as HTMLElement;
    const alto = Number.parseFloat(seccion.style.height);
    expect(alto).toBeGreaterThan(100 * PERFUMES_VITRINA.length * 0.5);
  });

  it("coloca los frascos en el montaje, sin esperar al primer scroll", () => {
    const { container } = render(<HeroVitrina />);
    const piezas = container.querySelectorAll<HTMLElement>(".vitrina-pieza");
    expect(piezas).toHaveLength(PERFUMES_VITRINA.length);
    for (const pieza of piezas) {
      expect(pieza.style.transform).toMatch(/translate3d/);
    }
  });

  it("el primero arranca al frente, y es el único al frente", () => {
    const { container } = render(<HeroVitrina />);
    const piezas = [...container.querySelectorAll<HTMLElement>(".vitrina-pieza")];

    expect(piezas[0]!.dataset.centrada).toBe("true");
    expect(piezas.filter((p) => p.dataset.centrada === "true")).toHaveLength(1);
  });
});

describe("movimiento reducido", () => {
  it("igual deja la fila puesta, solo que no la corre el scroll", () => {
    movimiento.reducido = true;
    const escuchar = vi.spyOn(window, "addEventListener");
    const { container } = render(<HeroVitrina />);

    const centrada = container.querySelector<HTMLElement>('.vitrina-pieza[data-centrada="true"]');
    expect(centrada).not.toBeNull();
    expect(escuchar).not.toHaveBeenCalledWith("scroll", expect.anything(), expect.anything());
  });
});
