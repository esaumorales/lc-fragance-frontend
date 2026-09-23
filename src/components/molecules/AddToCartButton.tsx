"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { addCartItem } from "@/lib/cart-api";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";
import { cn } from "@/lib/cn";

type AddToCartButtonProps = {
  productId: string;
  stock: number;
  className?: string;
  /** Etiquetas cortas para espacios angostos (tarjetas de grilla en mobile). */
  compact?: boolean;
  /** En la grilla va sin marco: la ficha no tiene caja y un boton con borde
   *  la volveria a encerrar. */
  variant?: "secondary" | "ghost";
};

export function AddToCartButton({
  productId,
  stock,
  className,
  compact = false,
  variant = "secondary",
}: AddToCartButtonProps) {
  const { accessToken } = useAuth();
  const { refresh } = useCart();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "added" | "error">("idle");
  // Se guarda el motivo real: "Error" a secas no le dice nada a nadie.
  const [reason, setReason] = useState<string | null>(null);

  async function handleClick() {
    if (!accessToken) {
      router.push("/login");
      return;
    }

    setStatus("loading");
    setReason(null);
    try {
      await addCartItem(accessToken, productId, 1);
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
