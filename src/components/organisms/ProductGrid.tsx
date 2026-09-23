"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/molecules/ProductCard";
import { getSocket } from "@/lib/socket";

type StockUpdatedPayload = { productId: string; stock: number };

export function ProductGrid({ products: initialProducts }: { products: Product[] }) {
  // Solo se guarda lo que llega en vivo por socket, no una copia de la prop:
  // asi una lista nueva del servidor entra sola, sin sincronizarla a mano.
  const [liveStock, setLiveStock] = useState<Record<string, number>>({});

  useEffect(() => {
    const socket = getSocket();

    function onStockUpdated({ productId, stock }: StockUpdatedPayload) {
      setLiveStock((current) => ({ ...current, [productId]: stock }));
    }

    socket.on("stock:updated", onStockUpdated);
    return () => {
      socket.off("stock:updated", onStockUpdated);
    };
  }, []);

  const products = initialProducts.map((product) =>
    product.id in liveStock ? { ...product, stock: liveStock[product.id] } : product
  );

  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay productos cargados.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-14 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4 lg:gap-x-10">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
