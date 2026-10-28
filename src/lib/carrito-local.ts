import type { Product } from "@/lib/types";
import { avisarCambioDeCarrito } from "@/lib/use-carrito-local";

// El carrito de quien no tiene cuenta. Vive en el navegador.

const CLAVE = "lc-fragance:carrito";
export const MAXIMO_POR_PRODUCTO = 99;

/**
 * Una foto del producto al momento de agregarlo.
 *
 * Se guarda lo justo para dibujar el carrito sin pedirle nada al servidor.
 * El precio de aca es para mostrar: el que se cobra lo recalcula el backend
 * al hacer el pedido, asi que una oferta que vencio no se cobra de menos.
 */
export type ItemLocal = {
  productId: string;
  slug: string;
  name: string;
  price: string;
  offerPrice?: string | null;
  image?: string | null;
  quantity: number;
};

type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * El almacenamiento del navegador, si se puede usar.
 *
 * En una ventana privada o con las cookies bloqueadas, tocarlo lanza. El
 * carrito no puede tirar abajo la pagina por eso: sin almacen, se trabaja
 * en memoria y se pierde al recargar, que es mejor que un error.
 */
function almacen(): Almacen | null {
  try {
    if (typeof window === "undefined") return null;
    window.localStorage.getItem(CLAVE);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function leerCarrito(desde: Almacen | null = almacen()): ItemLocal[] {
  if (!desde) return [];
  try {
    const crudo = desde.getItem(CLAVE);
    if (!crudo) return [];
    const datos = JSON.parse(crudo) as unknown;
    // Lo que hay guardado lo pudo tocar cualquiera: si no tiene la forma
    // esperada se descarta en vez de romper el carrito.
    return Array.isArray(datos) ? datos.filter(esItem) : [];
  } catch {
    return [];
  }
}

function esItem(valor: unknown): valor is ItemLocal {
  const item = valor as ItemLocal;
  return (
    typeof item?.productId === "string" &&
    typeof item?.name === "string" &&
    typeof item?.price === "string" &&
    Number.isFinite(item?.quantity) &&
    item.quantity > 0
  );
}

export function guardarCarrito(items: ItemLocal[], donde: Almacen | null = almacen()): void {
  try {
    donde?.setItem(CLAVE, JSON.stringify(items));
  } catch {
    // Sin espacio o sin permiso: el carrito sigue en memoria.
  }
  avisarCambioDeCarrito();
}

/** Agrega, o suma a lo que ya habia de ese producto. */
export function agregar(items: ItemLocal[], nuevo: ItemLocal, tope = MAXIMO_POR_PRODUCTO): ItemLocal[] {
  const existente = items.find((item) => item.productId === nuevo.productId);
  if (!existente) {
    return [...items, { ...nuevo, quantity: Math.min(nuevo.quantity, tope) }];
  }

  return items.map((item) =>
    item.productId === nuevo.productId
      ? { ...item, quantity: Math.min(item.quantity + nuevo.quantity, tope) }
      : item
  );
}

/** Cambia la cantidad. En cero o menos, el producto sale del carrito. */
export function cambiarCantidad(
  items: ItemLocal[],
  productId: string,
  cantidad: number,
  tope = MAXIMO_POR_PRODUCTO
): ItemLocal[] {
  if (cantidad <= 0) return quitar(items, productId);
  return items.map((item) =>
    item.productId === productId ? { ...item, quantity: Math.min(cantidad, tope) } : item
  );
}

export function quitar(items: ItemLocal[], productId: string): ItemLocal[] {
  return items.filter((item) => item.productId !== productId);
}

export function vaciar(donde: Almacen | null = almacen()): void {
  try {
    donde?.removeItem(CLAVE);
  } catch {
    // Nada que hacer: igual se vacia en memoria.
  }
  avisarCambioDeCarrito();
}

export function contar(items: readonly ItemLocal[]): number {
  return items.reduce((suma, item) => suma + item.quantity, 0);
}

/** Lo que viaja al backend: solo que y cuanto. El precio lo pone el servidor. */
export function paraElPedido(items: readonly ItemLocal[]) {
  return items.map((item) => ({ productId: item.productId, quantity: item.quantity }));
}

/** Lo que el carrito del navegador necesita guardar de un producto. */
export function paraCarrito(producto: Product) {
  return {
    productId: producto.id,
    slug: producto.slug,
    name: producto.name,
    price: producto.price,
    offerPrice: producto.offerPrice ?? null,
    image: producto.images[0] ?? null,
  };
}
