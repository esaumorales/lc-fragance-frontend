import { notFound } from "next/navigation";
import { CatalogLayout } from "@/components/templates/CatalogLayout";
import { Icon } from "@/components/atoms/Icon";
import { AddToCartButton } from "@/components/molecules/AddToCartButton";
import { ProductVisual } from "@/components/organisms/ProductVisual";
import { fetchProduct } from "@/lib/api";
import type { Product } from "@/lib/types";
import { precio } from "@/lib/precio";

type PageProps = { params: Promise<{ slug: string }> };

// Etiquetas legibles para los atributos conocidos (perfumes y tecnologia);
// cualquier atributo no mapeado igual se muestra, con su propia key como
// etiqueta — el modelo de datos es agnostico de rubro, no hay una lista
// cerrada de campos posibles.
const ATTRIBUTE_LABELS: Record<string, string> = {
  notasOlfativas: "Notas olfativas",
  marca: "Marca",
  mlVolume: "Volumen",
  genero: "Género",
  ram: "RAM",
  almacenamiento: "Almacenamiento",
};

function formatAttributeValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return String(value);
  return String(value);
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  let product: Product;
  try {
    product = await fetchProduct(slug);
  } catch {
    notFound();
  }

  const attributeEntries = Object.entries(product.attributes ?? {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );

  return (
    <CatalogLayout>
      <div className="product-detail grid gap-10 lg:gap-16 md:grid-cols-2">
        <ProductVisual product={product} />

        <div className="product-info flex flex-col gap-6 md:py-8">
          <h1 className="font-serif text-5xl leading-tight tracking-wide text-foreground">
            {product.name}
          </h1>
          <p className="text-3xl text-primary">{precio(product.price)}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Icon icon="mdi:package-variant-closed" />
            {product.stock > 0 ? `${product.stock} disponibles` : "Sin stock"}
          </p>
          <AddToCartButton productId={product.id} stock={product.stock} className="mt-2 w-full gap-2 py-4" />

          <div className="mt-4 flex flex-col gap-3 surface p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Detalles</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">SKU</span>
              <span className="text-foreground">{product.sku}</span>
            </div>
            {attributeEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{ATTRIBUTE_LABELS[key] ?? key}</span>
                <span className="text-right text-foreground">{formatAttributeValue(value)}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Icon icon="mdi:whatsapp" className="h-4 w-4 text-primary" />
              Coordinamos el envío por WhatsApp
            </span>
            <span className="flex items-center gap-2">
              <Icon icon="mdi:cash" className="h-4 w-4 text-primary" />
              Pago por Yape
            </span>
          </div>
        </div>
      </div>
    </CatalogLayout>
  );
}

// Evita prerender estático en build: el detalle depende del backend en runtime.
export const dynamic = "force-dynamic";


