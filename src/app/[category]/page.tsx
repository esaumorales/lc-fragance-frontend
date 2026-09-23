import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogLayout } from "@/components/templates/CatalogLayout";
import { CatalogFilters } from "@/components/organisms/CatalogFilters";
import { ProductGrid } from "@/components/organisms/ProductGrid";
import { fetchCategory, fetchProducts } from "@/lib/api";
import type { Category } from "@/lib/types";

type PageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Toma el primer valor: ?q=a&q=b no tiene que romper el listado. */
function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { category: slug } = await params;
  const query = await searchParams;

  let category: Category;
  try {
    category = await fetchCategory(slug);
  } catch {
    notFound();
  }

  const page = await fetchProducts({
    category: slug,
    q: first(query.q),
    minPrice: first(query.minPrice),
    maxPrice: first(query.maxPrice),
    inStock: first(query.inStock),
    sort: first(query.sort),
  });

  return (
    <CatalogLayout>
      <div className="catalog-heading"><p className="eyebrow">EL UNIVERSO LC FRAGANCE</p><h1 className="font-serif font-light text-foreground">
        {category.name}
      </h1><p>Descubre los detalles que hacen la diferencia.</p></div>

      {/* useSearchParams necesita un limite de Suspense propio. */}
      <Suspense fallback={<div className="mb-12 h-32" />}>
        <CatalogFilters total={page.total} />
      </Suspense>

      {page.items.length > 0 ? (
        <ProductGrid products={page.items} />
      ) : (
        <p className="py-20 text-center font-serif text-2xl font-light text-muted-foreground">
          No encontramos productos con esos filtros.
        </p>
      )}
    </CatalogLayout>
  );
}

// Evita prerender estático en build: el catálogo depende del backend en runtime.
export const dynamic = "force-dynamic";

