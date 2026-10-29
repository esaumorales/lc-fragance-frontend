import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorDeApi, fetchCategory, fetchProduct } from "@/lib/api";

function respuesta(status: number, cuerpo: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => cuerpo,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ErrorDeApi", () => {
  // Sin el código, quien llama no puede distinguir "esto no existe" de "la
  // API no contesta", y las dos cosas terminaban en la misma pantalla.
  it("lleva el código y la ruta que falló", () => {
    const error = new ErrorDeApi(502, "/api/categories");

    expect(error.status).toBe(502);
    expect(error.path).toBe("/api/categories");
  });

  it("solo el 404 significa que no existe", () => {
    expect(new ErrorDeApi(404, "/api/x").noExiste).toBe(true);
    expect(new ErrorDeApi(502, "/api/x").noExiste).toBe(false);
    expect(new ErrorDeApi(500, "/api/x").noExiste).toBe(false);
    expect(new ErrorDeApi(401, "/api/x").noExiste).toBe(false);
  });

  it("sigue siendo un Error, así que un catch genérico lo agarra", () => {
    expect(new ErrorDeApi(500, "/api/x")).toBeInstanceOf(Error);
  });
});

describe("lo que lanza apiFetch", () => {
  it("una categoría inexistente llega como 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(404)));

    await expect(fetchCategory("no-existe")).rejects.toMatchObject({
      status: 404,
      noExiste: true,
    });
  });

  // El caso que tiró la tienda: la API devolvía 502 y la página mostraba un
  // 404, como si la categoría no existiera.
  it("una API caída llega como 502, no como 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(502)));

    await expect(fetchProduct("oud-real")).rejects.toMatchObject({
      status: 502,
      noExiste: false,
    });
  });

  it("una respuesta buena devuelve los datos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(200, { slug: "perfumes" })));

    await expect(fetchCategory("perfumes")).resolves.toEqual({ slug: "perfumes" });
  });
});
