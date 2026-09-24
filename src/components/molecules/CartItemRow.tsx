"use client";

import Image from "next/image";
import type { CartItem } from "@/lib/types";
import { Icon } from "@/components/atoms/Icon";
import { precio } from "@/lib/precio";

type CartItemRowProps = {
  item: CartItem;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  disabled: boolean;
};

export function CartItemRow({ item, onQuantityChange, onRemove, disabled }: CartItemRowProps) {
  const image = item.product.images[0];
  const subtotal = (Number(item.product.price) * item.quantity).toFixed(2);

  return (
    <div className="flex items-center gap-4 border-b border-border py-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-muted">
        {image ? (
          <Image src={image} alt={item.product.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Icon icon="mdi:image-outline" className="h-6 w-6" />
          </div>
        )}
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{item.product.name}</p>
        <p className="text-sm text-muted-foreground">{precio(item.product.price)}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || item.quantity <= 1}
          onClick={() => onQuantityChange(item.productId, item.quantity - 1)}
          className="flex h-7 w-7 items-center justify-center rounded border border-border text-foreground disabled:opacity-40"
          aria-label="Disminuir cantidad"
        >
          <Icon icon="mdi:minus" className="h-4 w-4" />
        </button>
        <span className="w-6 text-center text-sm text-foreground">{item.quantity}</span>
        <button
          type="button"
          disabled={disabled || item.quantity >= item.product.stock}
          onClick={() => onQuantityChange(item.productId, item.quantity + 1)}
          className="flex h-7 w-7 items-center justify-center rounded border border-border text-foreground disabled:opacity-40"
          aria-label="Aumentar cantidad"
        >
          <Icon icon="mdi:plus" className="h-4 w-4" />
        </button>
      </div>

      <p className="w-16 text-right text-sm text-foreground">{precio(subtotal)}</p>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onRemove(item.productId)}
        className="text-muted-foreground hover:text-foreground disabled:opacity-40"
        aria-label="Quitar del carrito"
      >
        <Icon icon="mdi:trash-can-outline" />
      </button>
    </div>
  );
}
