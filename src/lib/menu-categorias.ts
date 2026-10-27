import type { Category } from "@/lib/types";

export type EnlaceDeCategoria = {
  href: string;
  label: string;
};

/**
 * Las categorias que merecen un lugar en el menu.
 *
 * Solo las de primer nivel y solo si tienen productos: un enlace a una
 * seccion vacia lleva a un cartel de "no encontramos productos", que es peor
 * que no ofrecer la seccion. `productCount` ya viene con los de las
 * subcategorias sumados, asi que un padre con stock abajo igual aparece.
 */
export function enlacesDeCategorias(categorias: readonly Category[]): EnlaceDeCategoria[] {
  return categorias
    .filter((categoria) => categoria.parentId === null && tieneProductos(categoria))
    .map((categoria) => ({ href: `/${categoria.slug}`, label: categoria.name }));
}

/**
 * Sin el dato se muestra igual.
 *
 * El sitio y la API se publican por separado: si el frontend sale primero, la
 * API vieja todavia no manda `productCount` y tomarlo por cero dejaria al sitio
 * entero sin menu. Un enlace de mas durante un despliegue se nota mucho menos.
 */
function tieneProductos(categoria: Category): boolean {
  return typeof categoria.productCount !== "number" || categoria.productCount > 0;
}
