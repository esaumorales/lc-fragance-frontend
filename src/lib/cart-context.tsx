"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { getCart } from "@/lib/cart-api";

type CartContextValue = {
  itemCount: number;
  refresh: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const [count, setCount] = useState(0);
  // Cada refresh() incrementa este contador y vuelve a disparar el efecto.
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    if (!accessToken) return;

    // Guarda de cancelacion: si el token cambia mientras la peticion vuela,
    // la respuesta vieja no debe pisar el conteo del token nuevo.
    let active = true;
    getCart(accessToken)
      .then((cart) => {
        if (active) setCount(cart.items.reduce((sum, item) => sum + item.quantity, 0));
      })
      .catch(() => {
        if (active) setCount(0);
      });

    return () => {
      active = false;
    };
  }, [accessToken, reloads]);

  const refresh = useCallback(() => setReloads((n) => n + 1), []);

  // Sin sesion el carrito esta vacio: se deriva en el render en vez de
  // sincronizarlo con un setState dentro del efecto.
  const itemCount = accessToken ? count : 0;

  return <CartContext.Provider value={{ itemCount, refresh }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart debe usarse dentro de <CartProvider>");
  }
  return ctx;
}
