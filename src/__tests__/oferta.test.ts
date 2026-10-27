import { describe, expect, it } from "vitest";
import { oferta } from "@/lib/oferta";
import type { Product } from "@/lib/types";

const AHORA = new Date("2026-06-15T12:00:00Z");

function producto(extra: Partial<Product> = {}): Product {
  return {
    id: "p-1",
    name: "Oud Real",
    slug: "oud-real",
    description: "Una fragancia",
    price: "200.00",
    sku: "OUD-1",
    stock: 5,
    images: [],
    model3dUrl: null,
    attributes: {},
    isActive: true,
    categoryId: "c-1",
    ...extra,
  } as Product;
}

describe("sin oferta", () => {
  it("se muestra el precio normal y nada tachado", () => {
    const resultado = oferta(producto(), AHORA);

    expect(resultado.precio).toBe("200.00");
    expect(resultado.precioTachado).toBeNull();
    expect(resultado.enOferta).toBe(false);
  });

  it("un producto viejo, sin los campos, no rompe nada", () => {
    expect(oferta(producto({ offerPrice: undefined }), AHORA).enOferta).toBe(false);
  });
});

describe("con oferta vigente", () => {
  const enOferta = producto({ offerPrice: "150.00" });

  it("muestra el rebajado y tacha el de lista", () => {
    const resultado = oferta(enOferta, AHORA);

    expect(resultado.precio).toBe("150.00");
    expect(resultado.precioTachado).toBe("200.00");
    expect(resultado.enOferta).toBe(true);
  });

  it("calcula cuánto baja", () => {
    expect(oferta(enOferta, AHORA).descuento).toBe(25);
  });
});

describe("con fechas", () => {
  const conFechas = producto({
    offerPrice: "150.00",
    offerStartsAt: "2026-06-10T00:00:00.000Z",
    offerEndsAt: "2026-06-20T23:59:59.000Z",
  });

  it("rige en el medio", () => {
    expect(oferta(conFechas, AHORA).enOferta).toBe(true);
  });

  // Arranca y termina sola: nadie tiene que entrar a sacarla.
  it("antes de empezar no rige", () => {
    expect(oferta(conFechas, new Date("2026-06-01T00:00:00Z")).enOferta).toBe(false);
  });

  it("después de terminar no rige", () => {
    expect(oferta(conFechas, new Date("2026-07-01T00:00:00Z")).enOferta).toBe(false);
  });
});

// La pantalla tiene que decir lo mismo que se cobra: un precio de oferta que
// no descuenta nada sería un cartel mintiendo.
describe("ofertas que no descuentan", () => {
  it("una oferta más cara se ignora", () => {
    expect(oferta(producto({ offerPrice: "250.00" }), AHORA).enOferta).toBe(false);
  });

  it("una oferta igual al precio se ignora", () => {
    expect(oferta(producto({ offerPrice: "200.00" }), AHORA).enOferta).toBe(false);
  });

  it("un valor que no es número se ignora", () => {
    expect(oferta(producto({ offerPrice: "regalado" }), AHORA).enOferta).toBe(false);
  });
});
