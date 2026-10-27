import { describe, expect, it } from "vitest";
import { enlacesDeCategorias } from "@/lib/menu-categorias";
import type { Category } from "@/lib/types";

function categoria(parcial: Partial<Category> & { slug: string }): Category {
  return {
    id: parcial.slug,
    name: parcial.name ?? parcial.slug,
    parentId: null,
    productCount: 0,
    ...parcial,
  };
}

describe("enlacesDeCategorias", () => {
  it("arma el enlace con el slug y el nombre de la categoría", () => {
    const enlaces = enlacesDeCategorias([
      categoria({ slug: "perfumes", name: "Perfumes", productCount: 12 }),
    ]);

    expect(enlaces).toEqual([{ href: "/perfumes", label: "Perfumes" }]);
  });

  // Lo que pidió el dueño: la sección vacía no se ofrece, y aparece sola en
  // cuanto le carga el primer producto.
  it("deja afuera a la categoría sin productos", () => {
    const enlaces = enlacesDeCategorias([
      categoria({ slug: "perfumes", name: "Perfumes", productCount: 12 }),
      categoria({ slug: "tecnologia", name: "Tecnología", productCount: 0 }),
    ]);

    expect(enlaces.map((e) => e.label)).toEqual(["Perfumes"]);
  });

  it("la muestra apenas tiene un producto", () => {
    const enlaces = enlacesDeCategorias([
      categoria({ slug: "tecnologia", name: "Tecnología", productCount: 1 }),
    ]);

    expect(enlaces.map((e) => e.label)).toEqual(["Tecnología"]);
  });

  // `productCount` ya viene con los descendientes sumados desde el backend:
  // un padre con stock solo en sus hijos sigue siendo una sección válida.
  it("muestra al padre cuyo stock está en las subcategorías", () => {
    const enlaces = enlacesDeCategorias([
      categoria({ slug: "tecnologia", name: "Tecnología", productCount: 7 }),
      categoria({ slug: "audio", name: "Audio", parentId: "tecnologia", productCount: 7 }),
    ]);

    expect(enlaces.map((e) => e.label)).toEqual(["Tecnología"]);
  });

  // El menú es de secciones, no un árbol: una subcategoría no va arriba.
  it("no sube las subcategorías al menú", () => {
    const enlaces = enlacesDeCategorias([
      categoria({ slug: "audio", name: "Audio", parentId: "tecnologia", productCount: 4 }),
    ]);

    expect(enlaces).toEqual([]);
  });

  it("sin categorías no hay enlaces", () => {
    expect(enlacesDeCategorias([])).toEqual([]);
  });

  // El sitio y la API se publican por separado. Si el frontend sale primero,
  // la API vieja no manda el dato: tomarlo por cero dejaría al sitio entero
  // sin menú durante el despliegue.
  it("muestra la categoría si la API todavía no manda el conteo", () => {
    const vieja = { id: "1", name: "Perfumes", slug: "perfumes", parentId: null } as Category;

    expect(enlacesDeCategorias([vieja])).toEqual([{ href: "/perfumes", label: "Perfumes" }]);
  });
});
