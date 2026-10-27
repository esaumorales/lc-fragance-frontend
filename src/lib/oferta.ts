import type { Product } from "@/lib/types";

// Que precio mostrar, y si hay que tachar el de lista.

export type Oferta = {
  /** El que se cobra hoy. */
  precio: string;
  /** El de lista, solo si hay oferta: es el que va tachado. */
  precioTachado: string | null;
  enOferta: boolean;
  /** Cuanto baja, redondeado, para el cartelito. */
  descuento: number;
};

/**
 * Las mismas reglas que el backend, porque la pantalla tiene que coincidir
 * con lo que se cobra. Si no, alguien ve un precio y paga otro.
 */
export function oferta(producto: Product, ahora: Date = new Date()): Oferta {
  const sinOferta: Oferta = {
    precio: producto.price,
    precioTachado: null,
    enOferta: false,
    descuento: 0,
  };

  const rebajado = Number(producto.offerPrice);
  const lista = Number(producto.price);
  if (producto.offerPrice == null || !Number.isFinite(rebajado) || rebajado >= lista) {
    return sinOferta;
  }

  // Cada fecha es opcional por su cuenta: sin desde ya empezo, sin hasta no
  // termina sola.
  if (producto.offerStartsAt && ahora < new Date(producto.offerStartsAt)) return sinOferta;
  if (producto.offerEndsAt && ahora > new Date(producto.offerEndsAt)) return sinOferta;

  return {
    precio: producto.offerPrice,
    precioTachado: producto.price,
    enOferta: true,
    descuento: Math.round(((lista - rebajado) / lista) * 100),
  };
}
