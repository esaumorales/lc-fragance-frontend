import { describe, expect, it } from "vitest";
import { ARCO, avance, capa, colocar, fotogramaParaDistancia, piezaCentrada, progresoDeSeccion } from "@/lib/vitrina";
import { PERFUMES_VITRINA } from "@/data/perfumes-vitrina";

describe("progresoDeSeccion", () => {
  const ALTO = 4000;
  const VENTANA = 1000;

  it("arranca en cero cuando la sección recién se pega arriba", () => {
    expect(progresoDeSeccion(0, ALTO, VENTANA)).toBe(0);
  });

  it("llega a uno cuando el final toca el borde inferior", () => {
    expect(progresoDeSeccion(-3000, ALTO, VENTANA)).toBe(1);
  });

  // Antes y después de la sección tiene que quedarse en los topes, si no la
  // fila se sigue corriendo cuando ya nadie la ve.
  it("no se pasa de los topes", () => {
    expect(progresoDeSeccion(500, ALTO, VENTANA)).toBe(0);
    expect(progresoDeSeccion(-9000, ALTO, VENTANA)).toBe(1);
  });

  it("devuelve cero si la sección no es más alta que la ventana", () => {
    expect(progresoDeSeccion(-200, 800, 1000)).toBe(0);
  });
});

describe("avance", () => {
  it("recorre de la primera pieza a la última", () => {
    expect(avance(0, 9)).toBe(0);
    expect(avance(1, 9)).toBe(8);
  });

  // Es fraccionario a propósito: si saltara de entero en entero, la fila se
  // movería a tirones en vez de deslizarse.
  it("da valores intermedios entre una pieza y la siguiente", () => {
    expect(avance(0.5, 9)).toBe(4);
    expect(avance(0.0625, 9)).toBe(0.5);
  });

  it("no se rompe con una sola pieza", () => {
    expect(avance(0.5, 1)).toBe(0);
  });
});

describe("piezaCentrada", () => {
  it("empieza en la primera y termina en la última", () => {
    expect(piezaCentrada(0, 9)).toBe(0);
    expect(piezaCentrada(1, 9)).toBe(8);
  });

  it("nunca devuelve un índice fuera del arreglo", () => {
    expect(piezaCentrada(-3, 9)).toBe(0);
    expect(piezaCentrada(7, 9)).toBe(8);
  });
});

describe("colocar", () => {
  it("la pieza del centro queda al frente, derecha y sin girar", () => {
    const centro = colocar(0);
    expect(centro.x).toBeCloseTo(0);
    expect(centro.z).toBeCloseTo(0);
    expect(centro.giro).toBeCloseTo(0);
    expect(centro.opacidad).toBe(1);
  });

  it("las de un lado y del otro van para lados opuestos", () => {
    expect(colocar(-1).x).toBeLessThan(0);
    expect(colocar(1).x).toBeGreaterThan(0);
  });

  // Van sobre un arco: cuanto más lejos del centro, más al fondo. Si no se
  // hundieran, la fila sería una tira plana y no habría profundidad.
  it("se hunden a medida que se alejan del centro", () => {
    expect(colocar(1).z).toBeLessThan(colocar(0).z);
    expect(colocar(2).z).toBeLessThan(colocar(1).z);
  });

  it("giran hacia el centro, cada lado al suyo", () => {
    expect(colocar(1).giro).toBeLessThan(0);
    expect(colocar(-1).giro).toBeGreaterThan(0);
  });

  it("se van apagando hacia los bordes para cerrar el círculo", () => {
    expect(colocar(3).opacidad).toBeLessThan(colocar(1).opacidad);
    expect(colocar(3).opacidad).toBe(0);
  });

  // Siguen en el HTML para el lector de pantalla, pero ya son transparentes:
  // un clic no puede caer en un frasco que nadie ve.
  it("las que quedan fuera de alcance no se pueden tocar", () => {
    expect(colocar(ARCO.alcance + 2).alcanzable).toBe(false);
    expect(colocar(ARCO.alcance + 2).opacidad).toBe(0);
    expect(colocar(0).alcanzable).toBe(true);
  });
});

describe("capa", () => {
  // El orden de pintado tiene que seguir al arco: si no, una pieza del fondo
  // se dibuja encima de la del frente.
  it("la del centro va encima de las de los lados", () => {
    expect(capa(0)).toBeGreaterThan(capa(1));
    expect(capa(1)).toBeGreaterThan(capa(2));
  });

  it("da lo mismo a los dos lados", () => {
    expect(capa(2)).toBe(capa(-2));
  });
});

describe("fotogramaParaDistancia", () => {
  it("usa los extremos laterales y el fotograma frontal en el centro", () => {
    expect(fotogramaParaDistancia(-1)).toBe(0);
    expect(fotogramaParaDistancia(0)).toBe(15);
    expect(fotogramaParaDistancia(1)).toBe(30);
  });

  it("recorre los pasos intermedios y respeta los límites", () => {
    expect(fotogramaParaDistancia(-0.5)).toBe(6);
    expect(fotogramaParaDistancia(0.5)).toBe(24);
    expect(fotogramaParaDistancia(-0.04)).toBe(14);
    expect(fotogramaParaDistancia(0.04)).toBe(16);
    expect(fotogramaParaDistancia(-9)).toBe(0);
    expect(fotogramaParaDistancia(9)).toBe(30);
  });
});

describe("la lista de perfumes", () => {
  it("tiene al menos tres: con menos no hay fila que mostrar", () => {
    expect(PERFUMES_VITRINA.length).toBeGreaterThanOrEqual(3);
  });

  it("cada uno trae imagen, nombre, nota y destino", () => {
    for (const perfume of PERFUMES_VITRINA) {
      expect(perfume.imagen).toMatch(/^\/hero\/perfumes\/.+\.(webp|png)$/);
      expect(perfume.vistas).toHaveLength(31);
      expect(perfume.vistas[15]).toBe(perfume.imagen);
      for (const vista of perfume.vistas) expect(vista).toMatch(/^\/hero\/perfumes\/.+\.webp$/);
      expect(perfume.nombre.length).toBeGreaterThan(0);
      expect(perfume.nota.length).toBeGreaterThan(0);
      expect(perfume.href.startsWith("/")).toBe(true);
    }
  });

  it("no repite imágenes", () => {
    const rutas = PERFUMES_VITRINA.map((p) => p.imagen);
    expect(new Set(rutas).size).toBe(rutas.length);
  });

  // Es el que se ve al abrir la página y el que mide el LCP.
  it("el primero existe y tiene su imagen", () => {
    expect(PERFUMES_VITRINA[0]?.imagen).toBeTruthy();
  });
});
