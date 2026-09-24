"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { checkout, getCart, removeCartItem, updateCartItem } from "@/lib/cart-api";
import type { Cart, CheckoutResult } from "@/lib/types";
import { CartItemRow } from "@/components/molecules/CartItemRow";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";
import { precio } from "@/lib/precio";

export function CartView() {
  const { user, accessToken, loading: authLoading } = useAuth();
  const { refresh: refreshCartCount } = useCart();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    // Guarda de cancelacion: si el token cambia mientras la peticion vuela,
    // la respuesta vieja no debe pisar el carrito del token nuevo.
    let active = true;
    getCart(accessToken)
      .then((next) => {
        if (active) setCart(next);
      })
      .catch(() => {
        if (active) setError("No se pudo cargar el carrito");
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  // Sin sesion no hay nada que cargar: se deriva en el render en vez de
  // apagar la bandera con un setState dentro del efecto.
  const loading = Boolean(accessToken) && !loaded;

  async function handleQuantityChange(productId: string, quantity: number) {
    if (!accessToken) return;
    setMutating(true);
    try {
      const updated = await updateCartItem(accessToken, productId, quantity);
      setCart(updated);
      refreshCartCount();
    } catch {
      setError("No se pudo actualizar la cantidad");
    } finally {
      setMutating(false);
    }
  }

  async function handleRemove(productId: string) {
    if (!accessToken) return;
    setMutating(true);
    try {
      const updated = await removeCartItem(accessToken, productId);
      setCart(updated);
      refreshCartCount();
    } catch {
      setError("No se pudo quitar el producto");
    } finally {
      setMutating(false);
    }
  }

  async function handleCheckout() {
    if (!accessToken) return;
    setMutating(true);
    setError(null);
    try {
      const res = await checkout(accessToken);
      setResult(res);
      setCart((current) => (current ? { ...current, items: [] } : current));
      refreshCartCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo confirmar el pedido");
    } finally {
      setMutating(false);
    }
  }

  if (authLoading || loading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!user) {
    return (
      <div className="cart-empty">
        <Icon icon="mdi:shopping-outline" />
        <p>Tu próxima selección comienza aquí.</p>
        <p>Inicia sesión para ver tu carrito.</p>
        <Link href="/login" className="text-primary">Iniciá sesión ↗</Link>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex flex-col gap-4 surface p-6">
        <p className="flex items-center gap-2 text-foreground">
          <Icon icon="mdi:check-circle" className="text-primary" />
          Pedido #{result.order.id.slice(0, 8)} confirmado — total {precio(result.order.total)}
        </p>
        <p className="text-sm text-muted-foreground">
          Para finalizar, pagá por Yape a nombre de{" "}
          <span className="text-foreground">{result.yape.name}</span> al número{" "}
          <span className="text-foreground">{result.yape.phone}</span> y enviá el comprobante.
        </p>
        {result.whatsappUrl ? (
          <a
            href={result.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit"
          >
            <Button variant="primary" className="gap-2">
              <Icon icon="mdi:whatsapp" />
              Confirmar por WhatsApp
            </Button>
          </a>
        ) : null}
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return <div className="cart-empty"><Icon icon="mdi:shopping-outline" /><p>Tu carrito está vacío.</p><span className="mt-3 block font-serif text-3xl text-foreground">Elige algo que hable de ti.</span></div>;
  }

  const total = cart.items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );

  return (
    <div className="cart-layout flex flex-col gap-6">
      <div className="surface px-5">
        {cart.items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemove}
            disabled={mutating}
          />
        ))}
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex items-center justify-between">
        <p className="text-lg text-foreground">Total: {precio(total)}</p>
        <Button variant="primary" disabled={mutating} onClick={handleCheckout} className="gap-2">
          <Icon icon="mdi:whatsapp" />
          Finalizar pedido
        </Button>
      </div>
    </div>
  );
}
