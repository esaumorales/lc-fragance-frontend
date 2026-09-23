"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Icon } from "@/components/atoms/Icon";
import { cn } from "@/lib/cn";

const SORTS = [
  { value: "recientes", label: "Recientes" },
  { value: "precio-asc", label: "Precio ↑" },
  { value: "precio-desc", label: "Precio ↓" },
  { value: "nombre", label: "A–Z" },
];

/**
 * Filtros del catálogo.
 *
 * El estado vive en la URL, no en el componente: así el resultado filtrado se
 * puede compartir y marcar, el botón atrás funciona, y la página sigue
 * renderizándose en el servidor con los filtros ya aplicados. Guardarlo en
 * useState obligaría a pedir los productos desde el cliente y perdería todo eso.
 */
export function CatalogFilters({ total }: { total: number }) {
  const router = useRouter();
  const params = useSearchParams();

  const urlQuery = params.get("q") ?? "";
  const [search, setSearch] = useState(urlQuery);
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Si la URL cambia por fuera (botón atrás, un enlace), el input se
  // reencuadra. Se ajusta durante el render y no en un efecto: así React lo
  // resuelve en la misma pasada, sin el render en cascada que provoca llamar
  // a setState dentro de un useEffect.
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    setSearch(urlQuery);
  }

  function apply(next: Record<string, string | null>) {
    const query = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") query.delete(key);
      else query.set(key, value);
    }
    // Cualquier cambio de filtro vuelve a la primera página.
    query.delete("page");
    const suffix = query.toString();
    router.replace(suffix ? `?${suffix}` : "?", { scroll: false });
  }

  function onSearchChange(value: string) {
    setSearch(value);
    if (debounce.current) clearTimeout(debounce.current);
    // Sin espera se dispararía una petición por tecla.
    debounce.current = setTimeout(() => apply({ q: value.trim() || null }), 350);
  }

  const sort = params.get("sort") ?? "recientes";
  const inStock = params.get("inStock") === "true";
  const minPrice = params.get("minPrice") ?? "";
  const maxPrice = params.get("maxPrice") ?? "";
  const hasFilters = Boolean(
    params.get("q") || params.get("minPrice") || params.get("maxPrice") || inStock
  );

  return (
    <div className="catalog-filters flex flex-col">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <label className="relative w-full sm:max-w-xs">
          <Icon
            icon="mdi:magnify"
            className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar"
            aria-label="Buscar productos"
            className="w-full border-b border-hairline/60 bg-transparent py-2 pl-6 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </label>

        <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
          {SORTS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => apply({ sort: option.value === "recientes" ? null : option.value })}
              data-active={sort === option.value}
              className={cn(
                "underline-grow text-[10px] uppercase tracking-[0.22em] transition-colors",
                sort === option.value
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Precio
          </span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={minPrice}
            onBlur={(event) => apply({ minPrice: event.target.value || null })}
            placeholder="Mín"
            aria-label="Precio mínimo"
            className="w-20 border-b border-hairline/60 bg-transparent py-1 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
          <span className="text-muted-foreground">—</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={maxPrice}
            onBlur={(event) => apply({ maxPrice: event.target.value || null })}
            placeholder="Máx"
            aria-label="Precio máximo"
            className="w-20 border-b border-hairline/60 bg-transparent py-1 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        <button
          type="button"
          onClick={() => apply({ inStock: inStock ? null : "true" })}
          aria-pressed={inStock}
          className={cn(
            "flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] transition-colors",
            inStock ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon
            icon={inStock ? "mdi:checkbox-marked-outline" : "mdi:checkbox-blank-outline"}
            className="h-4 w-4"
          />
          Solo disponibles
        </button>

        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {total} {total === 1 ? "producto" : "productos"}
        </span>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => apply({ q: null, minPrice: null, maxPrice: null, inStock: null })}
            className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground underline underline-offset-4 transition-colors hover:text-primary"
          >
            Limpiar
          </button>
        ) : null}
      </div>
    </div>
  );
}

