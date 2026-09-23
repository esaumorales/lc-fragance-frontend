import Link from "next/link";
import { CatalogLayout } from "@/components/templates/CatalogLayout";
import { ProductGrid } from "@/components/organisms/ProductGrid";
import { Hero } from "@/components/organisms/Hero";
import { Icon } from "@/components/atoms/Icon";
import { Reveal } from "@/components/atoms/Reveal";
import type { Product } from "@/lib/types";
import { fetchProducts } from "@/lib/api";

const PROMISES = [
  {
    icon: "mdi:airplane",
    title: "Traído a pedido",
    body: "Cada pieza se compra afuera y viaja hasta acá. Nada de stock genérico.",
  },
  {
    icon: "mdi:certificate-outline",
    title: "Original o no se vende",
    body: "Si no podemos verificar la procedencia, no entra al catálogo.",
  },
  {
    icon: "mdi:whatsapp",
    title: "Trato directo",
    body: "Coordinamos el envío por WhatsApp y se paga con Yape.",
  },
];

export default async function HomePage() {
  let products: Product[] = [];

  try {
    const page = await fetchProducts({ pageSize: "8" });
    products = page.items;
  } catch {
    products = [];
  }

  return (
    <CatalogLayout hero={<Hero />}>
      {/* Rotulo chico, titulo grande y el enlace al costado. */}
      <Reveal>
      <div className="collection-header flex flex-wrap items-end justify-between gap-6 border-b border-hairline/50 pb-8">
        <div>
          <p className="caps text-primary">La selección</p>
          <h2 className="mt-4 font-serif text-4xl font-light tracking-wide text-foreground sm:text-5xl">
            Piezas destacadas
          </h2>
        </div>
        <Link
          href="/perfumes"
          className="underline-grow caps flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
        >
          Ver todo
          <Icon icon="mdi:arrow-top-right" className="h-3.5 w-3.5" />
        </Link>
      </div>
      </Reveal>

      <Reveal delay={90}>
        <ProductGrid products={products} />
      </Reveal>

      <section className="promise-section grid border-t sm:grid-cols-3">
        {PROMISES.map((promise, index) => (
          <Reveal key={promise.title} delay={index * 110} className="flex flex-col gap-4">
            <Icon icon={promise.icon} className="h-5 w-5 text-primary" />
            <h3 className="font-serif font-light text-foreground">{promise.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{promise.body}</p>
          </Reveal>
        ))}
      </section>
    </CatalogLayout>
  );
}
export const dynamic = "force-dynamic";


