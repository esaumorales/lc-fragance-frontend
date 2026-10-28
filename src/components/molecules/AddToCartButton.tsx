"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { addCartItem } from "@/lib/cart-api";
import { agregar, guardarCarrito, leerCarrito, type ItemLocal } from "@/lib/carrito-local";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";
import { cn } from "@/lib/cn";

type AddToCartButtonProps = {
  /** Lo justo para dibujar el carrito de quien no tiene cuenta. */
  producto: Omit<ItemLocal, "quantity">;
  stock: number;
  className?: string;
  /** Etiquetas cortas para espacios angostos (tarjetas de grilla en mobile). */
  compact?: boolean;
  /** En la grilla va sin marco: la ficha no tiene caja y un boton con borde
   *  la volveria a encerrar. */
  variant?: "secondary" | "ghost";
};

export function AddToCartButton({
  producto,
  stock,
  className,
  compact = false,
  variant = "secondary",
}: AddToCartButtonProps) {
  const { accessToken } = useAuth();
  const { refresh } = useCart();
  const [status, setStatus] = useState<"idle" | "loading" | "added" | "error">("idle");
  // Se guarda el motivo real: "Error" a secas no le dice nada a nadie.
  const [reason, setReason] = useState<string | null>(null);

  async function handleClick() {
    // Sin cuenta se guarda en el navegador: mandar al login aca perdia la
    // venta de quien no se queria registrar.
    if (!accessToken) {
      guardarCarrito(agregar(leerCarrito(), { ...producto, quantity: 1 }));
      refresh();
      setStatus("added");
      setTimeout(() => setStatus("idle"), 1500);
      return;
    }

    setStatus("loading");
    setReason(null);
    try {
      await addCartItem(accessToken, producto.productId, 1);
      refresh();
      setStatus("added");
      setTimeout(() => setStatus("idle"), 1500);
    } catch (error) {
      setReason(error instanceof Error ? error.message : "No se pudo agregar");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
    }
  }

  const label =
    stock === 0
      ? "Sin stock"
      : status === "loading"
        ? "Agregando…"
        : status === "added"
          ? "Agregado"
          : status === "error"
            ? "Error"
            : compact
              ? "Agregar"
              : "Agregar al carrito";

  return (
    <Button
      variant={variant}
      disabled={stock === 0 || status === "loading"}
      onClick={handleClick}
      title={reason ?? undefined}
      className={cn("whitespace-nowrap", className)}
    >
      <Icon
        icon={status === "added" ? "mdi:check" : "mdi:cart-plus"}
        className="h-3.5 w-3.5"
      />
      {status === "error" && reason ? reason : label}
    </Button>
  );
}
