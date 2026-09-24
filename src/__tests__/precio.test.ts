import { describe, expect, it } from "vitest";
import { precio } from "@/lib/precio";

describe("precio", () => {
  it("muestra soles, no dólares", () => {
    expect(precio("250.00")).toContain("S/");
    expect(precio("250.00")).not.toContain("$");
  });

  it("siempre lleva dos decimales", () => {
    expect(precio(250)).toMatch(/250[.,]00/);
    expect(precio("49.9")).toMatch(/49[.,]90/);
  });

  it("acepta el decimal en texto que devuelve la API", () => {
    expect(precio("1234.50")).toMatch(/1[.,]234[.,]50/);
  });

  // Antes que mostrar "S/ NaN" en una pantalla, conviene un guion.
  it("no muestra NaN si el valor no sirve", () => {
    expect(precio(null)).toBe("—");
    expect(precio(undefined)).toBe("—");
    expect(precio("no-es-un-numero")).toBe("—");
  });
});

describe("precio: espaciado", () => {
  // Intl usa espacio duro; se ve igual pero rompe las búsquedas por texto.
  it("separa el símbolo con un espacio normal", () => {
    expect(precio("100.00")).toBe("S/ 100.00");
    expect(precio("100.00")).not.toContain("\u00a0");
  });
});
