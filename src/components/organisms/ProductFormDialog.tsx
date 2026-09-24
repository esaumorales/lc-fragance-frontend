"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { subirImagen } from "@/lib/upload-api";
import { createProduct, updateProduct } from "@/lib/admin-api";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/cn";
import type { Category, Product } from "@/lib/types";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";

const vacio = {
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

function desdeProducto(producto: Product) {
  const atributos = producto.attributes as { notasOlfativas?: unknown; marca?: unknown };
  return {
    name: producto.name,
    slug: producto.slug,
    description: producto.description,
    price: String(producto.price),
    sku: producto.sku,
    stock: String(producto.stock),
    categoryId: producto.categoryId,
    imageUrl: producto.images[0] ?? "",
    notas: Array.isArray(atributos.notasOlfativas) ? atributos.notasOlfativas.join(", ") : "",
    marca: typeof atributos.marca === "string" ? atributos.marca : "",
  };
}

type Props = {
  // Con producto edita; sin producto da de alta uno nuevo.
  producto: Product | null;
  categories: Category[];
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
};

export function ProductFormDialog({ producto, categories, onCerrar, onGuardado }: Props) {
  const { accessToken } = useAuth();
  const dialogo = useRef<HTMLDialogElement>(null);
  const selector = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(() =>
    producto ? desdeProducto(producto) : { ...vacio, categoryId: categories[0]?.id ?? "" }
  );
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El dialogo nativo da el fondo, el foco y la tecla Escape sin escribirlos.
  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    nodo.showModal();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      nodo.close();
      document.body.style.overflow = anterior;
    };
  }, []);

  async function subirArchivo(archivo: File | undefined | null) {
    if (!archivo || !accessToken) return;
    setSubiendo(true);
    setError(null);
    try {
      const url = await subirImagen(accessToken, archivo);
      setForm((actual) => ({ ...actual, imageUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setSubiendo(false);
    }
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (!accessToken || guardando) return;
    setGuardando(true);
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
      if (producto) {
        // El stock no viaja: se ajusta desde la lista y mandarlo aca pisaria
        // cualquier cambio hecho mientras el formulario estaba abierto.
        await updateProduct(accessToken, producto.id, datos);
        onGuardado(`"${form.name}" se actualizó.`);
      } else {
        await createProduct(accessToken, { ...datos, stock: Number(form.stock) });
        onGuardado(`"${form.name}" se creó correctamente.`);
      }
      onCerrar();
    } catch (err) {
      const accion = producto ? "actualizar" : "crear";
      setError(err instanceof Error ? err.message : `No se pudo ${accion} el producto`);
    } finally {
      setGuardando(false);
    }
  }

  const hayImagen = form.imageUrl.startsWith("http");

  return (
    <dialog
      ref={dialogo}
      className="admin-dialog"
      aria-labelledby="titulo-producto"
      onCancel={(e) => {
        e.preventDefault();
        onCerrar();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <form onSubmit={guardar} className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="caps text-primary">{producto ? "Editar" : "Nuevo"}</p>
            <h2 id="titulo-producto" className="mt-2 font-serif text-3xl">
              {producto ? producto.name : "Agregar un producto"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline text-xl"
          >
            ×
          </button>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            subirArchivo(e.dataTransfer.files?.[0]);
          }}
          onPaste={(e) => subirArchivo(e.clipboardData.files?.[0])}
          className={cn(
            "zona-arrastre relative grid min-h-44 place-items-center overflow-hidden border border-dashed p-5 text-center transition-colors",
            arrastrando ? "border-primary bg-primary/10" : "border-border"
          )}
        >
          {hayImagen ? (
            <Image
              src={form.imageUrl}
              alt="Vista previa de la imagen"
              fill
              sizes="(max-width: 640px) 90vw, 640px"
              className="object-contain p-3"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Icon icon="mdi:cloud-upload-outline" className="h-9 w-9 text-primary/70" />
              <p className="text-sm">Arrastrá una imagen acá</p>
              <p className="text-[11px] uppercase tracking-[0.18em]">o pegala con Ctrl+V</p>
            </div>
          )}

          {subiendo ? (
            <div className="absolute inset-0 grid place-items-center bg-background/75">
              <Icon icon="mdi:loading" className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : null}

          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={() => selector.current?.click()}
              disabled={subiendo}
              className="border border-hairline bg-surface px-3 py-1.5 text-[10px] uppercase tracking-[0.18em]"
            >
              {hayImagen ? "Cambiar" : "Elegir archivo"}
            </button>
            {hayImagen ? (
              <button
                type="button"
                onClick={() => setForm({ ...form, imageUrl: "" })}
                className="border border-hairline bg-surface px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-red-400"
              >
                Quitar
              </button>
            ) : null}
          </div>

          <input
            ref={selector}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            aria-label="Elegir archivo de imagen"
            onChange={async (e) => {
              await subirArchivo(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <Input
          placeholder="URL de la imagen" aria-label="URL de la imagen"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          className="w-full text-xs"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Nombre" aria-label="Nombre" autoFocus
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
            type="number" step="0.01" min="0.01"
            placeholder="Precio" aria-label="Precio"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
          {/* Al editar no aparece: el stock se ajusta desde la lista. */}
          {producto ? null : (
            <Input
              type="number" min="0" step="1"
              placeholder="Stock inicial" aria-label="Stock inicial"
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

        {error ? (
          <p role="alert" className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-400">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-4">
          <button
            type="button"
            onClick={onCerrar}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancelar
          </button>
          <Button type="submit" disabled={guardando} className="gap-2">
            <Icon icon={producto ? "mdi:content-save-outline" : "mdi:plus"} />
            {guardando ? "Guardando…" : producto ? "Guardar cambios" : "Crear producto"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
