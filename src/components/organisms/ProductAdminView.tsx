"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchCategories, fetchProducts } from "@/lib/api";
import { adjustStock, deleteProduct } from "@/lib/admin-api";
import { cn } from "@/lib/cn";
import type { Category, Product } from "@/lib/types";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";
import { BottleIcon } from "@/components/atoms/BottleIcon";
import { ProductFormDialog } from "@/components/organisms/ProductFormDialog";

// Qué está abierto: nada, el alta, o la edición de un producto.
type Formulario = { modo: "cerrado" } | { modo: "alta" } | { modo: "edicion"; producto: Product };

export function ProductAdminView() {
  const { accessToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formulario, setFormulario] = useState<Formulario>({ modo: "cerrado" });
  const [busqueda, setBusqueda] = useState("");
  // Borrar pregunta en la misma fila, sin cuadro del navegador.
  const [confirmandoBorrado, setConfirmandoBorrado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function notifySuccess(message: string) {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 2500);
  }

  function loadData() {
    Promise.all([fetchProducts(), fetchCategories()])
      .then(([page, cats]) => {
        setProducts(page.items);
        setCategories(cats);
      })
      .catch(() => setError("No se pudieron cargar los productos"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  // Con el catálogo crecido, encontrar un producto a ojo es imposible.
  const termino = busqueda.trim().toLowerCase();
  const visibles = termino
    ? products.filter(
        (p) => p.name.toLowerCase().includes(termino) || p.sku.toLowerCase().includes(termino)
      )
    : products;

  async function handleDelete(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await deleteProduct(accessToken, id);
      setConfirmandoBorrado(null);
      notifySuccess("Producto eliminado.");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el producto");
    }
  }

  async function handleStockChange(id: string, change: number) {
    if (!accessToken) return;
    setError(null);
    try {
      await adjustStock(accessToken, id, change, "manual_adjustment");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ajustar el stock");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-2xl tracking-wide text-foreground">Productos</h1>
        <Button
          type="button"
          onClick={() => setFormulario({ modo: "alta" })}
          disabled={categories.length === 0}
          className="gap-2"
        >
          <Icon icon="mdi:plus" />
          Nuevo producto
        </Button>
      </div>

      {products.length > 0 ? (
        <Input
          placeholder="Buscar por nombre o SKU" aria-label="Buscar por nombre o SKU"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full sm:max-w-xs"
        />
      ) : null}

      {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}
      {success ? (
        <p className="flex items-center gap-2 text-sm text-primary">
          <Icon icon="mdi:check-circle-outline" className="h-4 w-4" />
          {success}
        </p>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon icon="mdi:loading" className="h-4 w-4 animate-spin text-primary" />
          Cargando…
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visibles.map((product) => (
            <div
              key={product.id}
              className="flex flex-wrap items-center justify-between gap-4 surface px-4 py-3"
            >
              {/* La fila entera abre la edición: no hay que buscar un botón. */}
              <button
                type="button"
                onClick={() => setFormulario({ modo: "edicion", producto: product })}
                aria-label={`Editar ${product.name}`}
                className="group flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden bg-muted">
                  {product.images[0] ? (
                    <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                  ) : (
                    <BottleIcon className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground/50" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground transition-colors group-hover:text-primary">
                    {product.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {product.sku} · ${product.price} ·{" "}
                    {categories.find((c) => c.id === product.categoryId)?.name ?? "Sin categoría"}
                  </p>
                </div>
              </button>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStockChange(product.id, -1)}
                  className="flex h-7 w-7 items-center justify-center border border-border text-foreground transition-colors hover:border-primary"
                  disabled={product.stock === 0} aria-label="Restar stock"
                >
                  <Icon icon="mdi:minus" className="h-4 w-4" />
                </button>
                <span
                  className={cn(
                    "w-8 text-center text-sm",
                    product.stock <= 5 ? "text-primary" : "text-foreground"
                  )}
                >
                  {product.stock}
                </span>
                <button
                  type="button"
                  onClick={() => handleStockChange(product.id, 1)}
                  className="flex h-7 w-7 items-center justify-center border border-border text-foreground transition-colors hover:border-primary"
                  aria-label="Sumar stock"
                >
                  <Icon icon="mdi:plus" className="h-4 w-4" />
                </button>
              </div>

              {confirmandoBorrado === product.id ? (
                <span className="flex shrink-0 items-center gap-3 text-xs">
                  <span className="text-muted-foreground">¿Eliminar?</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(product.id)}
                    className="uppercase tracking-[0.1em] text-red-400"
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmandoBorrado(null)}
                    className="uppercase tracking-[0.1em] text-muted-foreground"
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmandoBorrado(product.id)}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-red-400"
                  aria-label={`Eliminar ${product.name}`}
                >
                  <Icon icon="mdi:trash-can-outline" className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          {products.length === 0 ? (
            <p className="surface px-4 py-3 text-sm text-muted-foreground">
              No hay productos todavía.
            </p>
          ) : null}
          {products.length > 0 && visibles.length === 0 ? (
            <p className="surface px-4 py-3 text-sm text-muted-foreground">
              Ningún producto coincide con “{busqueda}”.
            </p>
          ) : null}
        </div>
      )}

      {formulario.modo !== "cerrado" ? (
        <ProductFormDialog
          // La clave reinicia el formulario al pasar de un producto a otro.
          key={formulario.modo === "edicion" ? formulario.producto.id : "alta"}
          producto={formulario.modo === "edicion" ? formulario.producto : null}
          categories={categories}
          onCerrar={() => setFormulario({ modo: "cerrado" })}
          onGuardado={(mensaje) => {
            notifySuccess(mensaje);
            loadData();
          }}
        />
      ) : null}
    </div>
  );
}
