"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { getCart, removeCartItem, updateCartItem } from "@/lib/cart-api";
import { useCarritoLocal } from "@/lib/use-carrito-local";
import {
  cambiarCantidad,
  guardarCarrito,
  leerCarrito,
  quitar,
  type ItemLocal,
} from "@/lib/carrito-local";
import type { Cart, CartItem } from "@/lib/types";
import { CartItemRow } from "@/components/molecules/CartItemRow";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";
import { precio } from "@/lib/precio";
import { oferta } from "@/lib/oferta";

/**
 * Un renglon del carrito local, vestido de CartItem.
 *
 * Asi la misma fila sirve para los dos carritos y no hay dos componentes
 * dibujando lo mismo. Lo que falta del producto no se usa para mostrar.
 */
function comoItem(local: ItemLocal): CartItem {
  return {
    id: local.productId,
    productId: local.productId,
    quantity: local.quantity,
    product: {
      id: local.productId,
      name: local.name,
      slug: local.slug,
      price: local.price,
      offerPrice: local.offerPrice ?? null,
      images: local.image ? [local.image] : [],
    },
  } as CartItem;
}

export function CartView() {
  const { accessToken, loading: authLoading } = useAuth();
  const { refresh: refrescarContador } = useCart();

  const [itemsDelServidor, setItemsDelServidor] = useState<CartItem[]>([]);
  const [cargado, setCargado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sin sesion el carrito se lee de donde vive, no se copia a un estado
  // desde un efecto: eso encadenaba renders.
  const local = useCarritoLocal();

  useEffect(() => {
    if (!accessToken) return;

    let vivo = true;
    getCart(accessToken)
      .then((cart: Cart) => {
        if (vivo) setItemsDelServidor(cart.items);
      })
      .catch(() => {
        if (vivo) setError("No se pudo cargar el carrito");
      })
      .finally(() => {
        if (vivo) setCargado(true);
      });

    return () => {
      vivo = false;
    };
  }, [accessToken]);

  const items = accessToken ? itemsDelServidor : local.map(comoItem);

  async function cambiar(productId: string, cantidad: number) {
    setError(null);
    if (!accessToken) {
      guardarCarrito(cambiarCantidad(leerCarrito(), productId, cantidad));
      refrescarContador();
      return;
    }

    setOcupado(true);
    try {
      setItemsDelServidor((await updateCartItem(accessToken, productId, cantidad)).items);
      refrescarContador();
    } catch {
      setError("No se pudo actualizar la cantidad");
    } finally {
      setOcupado(false);
    }
  }

  async function sacar(productId: string) {
    setError(null);
    if (!accessToken) {
      guardarCarrito(quitar(leerCarrito(), productId));
      refrescarContador();
      return;
    }

    setOcupado(true);
    try {
      setItemsDelServidor((await removeCartItem(accessToken, productId)).items);
      refrescarContador();
    } catch {
      setError("No se pudo quitar el producto");
    } finally {
      setOcupado(false);
    }
  }

  if (authLoading || (accessToken && !cargado)) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="cart-empty">
        <Icon icon="mdi:shopping-outline" />
        <p>Tu carrito está vacío.</p>
        <span className="mt-3 block font-serif text-3xl text-foreground">
          Elige algo que hable de ti.
        </span>
      </div>
    );
  }

  // El mismo precio que cobra el backend: si el total de la pantalla usara el
  // de lista, no coincidiria con el del pedido.
  const total = items.reduce(
    (suma, item) => suma + Number(oferta(item.product).precio) * item.quantity,
    0
  );

  return (
    <div className="cart-layout flex flex-col gap-6">
      <div className="surface px-5">
        {items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            onQuantityChange={cambiar}
            onRemove={sacar}
            disabled={ocupado}
          />
        ))}
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-lg text-foreground">Total: {precio(total)}</p>
        <Link href="/checkout">
          <Button variant="primary" className="gap-2">
            Continuar al pago
            <Icon icon="mdi:arrow-right" />
          </Button>
        </Link>
      </div>

      {/* No hace falta cuenta para comprar: decirlo aca evita que alguien
          abandone el carrito pensando que si. */}
      {!accessToken ? (
        <p className="text-xs text-muted-foreground">
          Podés comprar sin crear una cuenta.{" "}
          <Link href="/login" className="text-primary">
            Iniciá sesión
          </Link>{" "}
          si ya tenés una.
        </p>
      ) : null}
    </div>
  );
}
