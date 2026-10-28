"use client";

import { useSyncExternalStore } from "react";
import { leerCarrito, type ItemLocal } from "@/lib/carrito-local";

/**
 * El carrito del navegador, como estado externo.
 *
 * Leerlo dentro de un efecto obliga a un setState sincrono y encadena
 * renders; con useSyncExternalStore se lee donde esta, y en el servidor
 * devuelve vacio sin inventar nada.
 */

const VACIO: ItemLocal[] = [];
const EVENTO = "lc-fragance:carrito-cambio";

// La instantanea tiene que devolver siempre la misma referencia mientras nada
// cambie: si se reparsea en cada llamada, React entra en un bucle.
let cache: ItemLocal[] | null = null;

function instantanea(): ItemLocal[] {
  cache ??= leerCarrito();
  return cache;
}

function suscribir(alCambiar: () => void) {
  const manejar = () => {
    cache = null;
    alCambiar();
  };
  window.addEventListener(EVENTO, manejar);
  // Tambien cuando se toca desde otra pestaña del mismo sitio.
  window.addEventListener("storage", manejar);
  return () => {
    window.removeEventListener(EVENTO, manejar);
    window.removeEventListener("storage", manejar);
  };
}

/** Avisa que el carrito cambio. Lo llama quien escribe en el almacen. */
export function avisarCambioDeCarrito(): void {
  cache = null;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO));
}

export function useCarritoLocal(): ItemLocal[] {
  return useSyncExternalStore(suscribir, instantanea, () => VACIO);
}
