import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { Icon } from "@/components/atoms/Icon";

import { AddToCartButton } from "@/components/molecules/AddToCartButton";
import { precio } from "@/lib/precio";

// Detalle editorial breve tomado de attributes (agnostico de rubro): notas
// para perfumes, marca para tecnologia, o nada si el producto no trae esos
// campos — no se asume que todos los rubros comparten atributos.
function getEyebrow(product: Product): string | null {
  const notas = product.attributes?.notasOlfativas;
  if (Array.isArray(notas) && notas.every((n) => typeof n === "string")) {
    return notas.join(" · ");
  }
  const marca = product.attributes?.marca;
  if (typeof marca === "string") {
    return marca;
  }
  return null;
}

/**
 * Ficha de producto sin caja: ni borde, ni fondo, ni sombra. Cada producto se
 * separa del de al lado por aire y por el bloque de imagen, que es como se
 * ordena un catalogo de lujo. Encerrar cada uno en un marco es lo que hacia
 * que la grilla se leyera como panel de control.
 */
export function ProductCard({ product }: { product: Product }) {
  const image = product.images[0];
  const eyebrow = getEyebrow(product);

  return (
    <article className="product-card group flex flex-col">
      <Link
        href={`/productos/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden bg-surface"
      >
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain p-6 transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
          />
        ) : (
          <div className="product-placeholder"><span aria-hidden="true">LC</span><span>FOTOGRAFÍA PRÓXIMAMENTE</span></div>
        )}

        {/* Barra fina que sube al pasar el mouse, en vez de un velo con un
            recuadro flotando en el medio. */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-background/85 py-3 text-center text-[10px] uppercase tracking-[0.28em] text-foreground backdrop-blur-sm transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0">
          Ver detalle
        </span>

        {product.model3dUrl ? (
          <span className="absolute left-3 top-3 flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-primary">
            <Icon icon="mdi:rotate-3d-variant" className="h-3.5 w-3.5" />
            3D
          </span>
        ) : null}

        {product.stock === 0 ? (
          <span className="absolute right-3 top-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Agotado
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col pt-5">
        {eyebrow ? (
          <p className="truncate text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}

        <Link href={`/productos/${product.slug}`} className="mt-2">
          <h3 className="line-clamp-2 font-serif text-xl leading-tight text-foreground transition-colors duration-300 group-hover:text-primary">
            {product.name}
          </h3>
        </Link>

        <div className="mt-2 flex items-baseline justify-between gap-3">
          <p className="text-sm tracking-wide text-foreground">{precio(product.price)}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {product.stock > 0 ? `${product.stock} disp.` : "Sin stock"}
          </p>
        </div>

        <AddToCartButton
          productId={product.id}
          stock={product.stock}
          compact
          variant="ghost"
          className="mt-4 gap-2 px-0 py-2 text-[10px] tracking-[0.22em] hover:text-primary"
        />
      </div>
    </article>
  );
}


