"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { subirImagen } from "@/lib/upload-api";
import { fetchCategories, fetchProducts } from "@/lib/api";
import { adjustStock, createProduct, deleteProduct, updateProduct } from "@/lib/admin-api";
import type { Category, Product } from "@/lib/types";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";
import { BottleIcon } from "@/components/atoms/BottleIcon";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  price: "",
  sku: "",
  stock: "0",
  categoryId: "",
  imageUrl: "",
  notas: "",
  marca: "",
};

export function ProductAdminView() {
  const { accessToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Con un id adentro, el formulario edita ese producto en vez de crear uno.
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function notifySuccess(message: string) {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 2500);
  }

  function loadData() {
    Promise.all([fetchProducts(), fetchCategories()])
      .then(([page, cats]) => {
        setProducts(page.items);
        setCategories(cats);
        setForm((f) => ({ ...f, categoryId: f.categoryId || cats[0]?.id || "" }));
      })
      .catch(() => setError("No se pudieron cargar los productos"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setSubmitting(true);
    setError(null);

    const notas = form.notas
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    const datos = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description,
      price: Number(form.price),
      sku: form.sku,
      categoryId: form.categoryId,
      images: form.imageUrl ? [form.imageUrl] : [],
      attributes: {
        ...(notas.length > 0 ? { notasOlfativas: notas } : {}),
        ...(form.marca ? { marca: form.marca } : {}),
      },
    };

    try {
      if (editandoId) {
        // El stock queda afuera: se ajusta con los botones de la lista y
        // mandarlo aca pisaria cualquier cambio hecho mientras tanto.
        await updateProduct(accessToken, editandoId, datos);
        notifySuccess(`"${form.name}" se actualizó.`);
        cancelarEdicion();
      } else {
        await createProduct(accessToken, { ...datos, stock: Number(form.stock) });
        setForm({ ...emptyForm, categoryId: form.categoryId });
        notifySuccess(`"${form.name}" se creó correctamente.`);
      }
      loadData();
    } catch (err) {
      const accion = editandoId ? "actualizar" : "crear";
      setError(err instanceof Error ? err.message : `No se pudo ${accion} el producto`);
    } finally {
      setSubmitting(false);
    }
  }

  function editar(product: Product) {
    const atributos = product.attributes as { notasOlfativas?: unknown; marca?: unknown };
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: String(product.price),
      sku: product.sku,
      stock: String(product.stock),
      categoryId: product.categoryId,
      imageUrl: product.images[0] ?? "",
      notas: Array.isArray(atributos.notasOlfativas) ? atributos.notasOlfativas.join(", ") : "",
      marca: typeof atributos.marca === "string" ? atributos.marca : "",
    });
    setEditandoId(product.id);
    setError(null);
    setErrorSubida(null);
    // El formulario esta arriba de la lista: sin esto, al editar un producto
    // del final parece que no paso nada.
    formRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? "" });
    setError(null);
    setErrorSubida(null);
  }

  async function handleDelete(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await deleteProduct(accessToken, id);
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
      <h1 className="font-serif text-2xl tracking-wide text-foreground">Productos</h1>

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5 surface p-5">
        <div>
          <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-primary">
            {editandoId ? `Editando "${form.name}"` : "Datos básicos"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Nombre" aria-label="Nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              placeholder="Slug (opcional)" aria-label="Slug (opcional)"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
            <Input
              placeholder="SKU" aria-label="SKU"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              required
            />
            <select aria-label="Categoría"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input
              type="number"
              step="0.01" min="0.01"
              placeholder="Precio" aria-label="Precio"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
            {/* Al editar no va: el stock se ajusta con los botones de la lista. */}
            {editandoId ? null : (
              <Input
                type="number"
                min="0" step="1" placeholder="Stock inicial" aria-label="Stock inicial"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                required
              />
            )}
            <Input
              placeholder="Descripción" aria-label="Descripción"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="sm:col-span-2"
              required
            />
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-primary">
            Imagen y atributos (opcional)
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Input
                placeholder="URL de la imagen" aria-label="URL de la imagen"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              />
              {/* Se puede pegar la URL o subir el archivo; la subida rellena el campo. */}
              <label className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={subiendo || !accessToken}
                  className="max-w-full text-[11px] file:mr-3 file:border file:border-hairline file:bg-transparent file:px-3 file:py-1.5 file:text-[10px] file:uppercase file:tracking-[0.18em] file:text-foreground"
                  onChange={async (e) => {
                    const archivo = e.target.files?.[0];
                    if (!archivo || !accessToken) return;
                    setSubiendo(true);
                    setErrorSubida(null);
                    try {
                      const url = await subirImagen(accessToken, archivo);
                      setForm((actual) => ({ ...actual, imageUrl: url }));
                    } catch (error) {
                      setErrorSubida(error instanceof Error ? error.message : "No se pudo subir");
                    } finally {
                      setSubiendo(false);
                      e.target.value = "";
                    }
                  }}
                />
                {subiendo ? "Subiendo…" : "o subí el archivo"}
              </label>
              {errorSubida ? <p className="text-[11px] text-red-400">{errorSubida}</p> : null}
            </div>
            <Input
              placeholder="Notas olfativas (separadas por coma)" aria-label="Notas olfativas (separadas por coma)"
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
            />
            <Input
              placeholder="Marca" aria-label="Marca"
              value={form.marca}
              onChange={(e) => setForm({ ...form, marca: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={submitting} className="w-fit gap-2">
            <Icon icon={editandoId ? "mdi:content-save-outline" : "mdi:plus"} />
            {editandoId ? "Guardar cambios" : "Crear producto"}
          </Button>
          {editandoId ? (
            <button
              type="button"
              onClick={cancelarEdicion}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

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
          {products.map((product) => (
            <div
              key={product.id}
              className="flex flex-wrap items-center justify-between gap-4 surface px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden bg-muted">
                  {product.images[0] ? (
                    <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                  ) : (
                    <BottleIcon className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground/50" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.sku} · ${product.price} ·{" "}
                    {categories.find((c) => c.id === product.categoryId)?.name ?? "Sin categoría"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStockChange(product.id, -1)}
                  className="flex h-7 w-7 items-center justify-center border border-border text-foreground transition-colors hover:border-primary"
                  disabled={product.stock === 0} aria-label="Restar stock"
                >
                  <Icon icon="mdi:minus" className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm text-foreground">{product.stock}</span>
                <button
                  type="button"
                  onClick={() => handleStockChange(product.id, 1)}
                  className="flex h-7 w-7 items-center justify-center border border-border text-foreground transition-colors hover:border-primary"
                  aria-label="Sumar stock"
                >
                  <Icon icon="mdi:plus" className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => editar(product)}
                className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                aria-label={`Editar ${product.name}`}
              >
                <Icon icon="mdi:pencil-outline" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(product.id)}
                className="shrink-0 text-muted-foreground transition-colors hover:text-red-400"
                aria-label={`Eliminar ${product.name}`}
              >
                <Icon icon="mdi:trash-can-outline" className="h-4 w-4" />
              </button>
            </div>
          ))}
          {products.length === 0 ? (
            <p className="surface px-4 py-3 text-sm text-muted-foreground">
              No hay productos todavía.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

