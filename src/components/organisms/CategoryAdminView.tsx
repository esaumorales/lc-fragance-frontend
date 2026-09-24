"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchCategories } from "@/lib/api";
import { createCategory, deleteCategory } from "@/lib/admin-api";
import type { Category } from "@/lib/types";
import { slugify } from "@/lib/slug";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";

export function CategoryAdminView() {
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function notifySuccess(message: string) {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 2500);
  }

  function loadCategories() {
    fetchCategories()
      .then(setCategories)
      .catch(() => setError("No se pudieron cargar las categorías"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setSubmitting(true);
    setError(null);

    try {
      await createCategory(accessToken, { name, slug: slug || slugify(name) });
      notifySuccess(`"${name}" se creó correctamente.`);
      setName("");
      setSlug("");
      loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la categoría");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await deleteCategory(accessToken, id);
      notifySuccess("Categoría eliminada.");
      loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la categoría");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl tracking-wide text-foreground">Categorías</h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-4 surface p-5"
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Nombre
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Perfumes"
            required
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Slug (opcional)
          </label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={slugify(name) || "perfumes"}
          />
        </div>
        <Button type="submit" disabled={submitting} className="gap-2">
          <Icon icon="mdi:plus" />
          Crear categoría
        </Button>
      </form>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
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
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-4 surface px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Icon icon="mdi:tag-outline" className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm text-foreground">{category.name}</p>
                  <p className="text-xs text-muted-foreground">{category.slug}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(category.id)}
                className="text-muted-foreground transition-colors hover:text-red-400"
                aria-label={`Eliminar ${category.name}`}
              >
                <Icon icon="mdi:trash-can-outline" className="h-4 w-4" />
              </button>
            </div>
          ))}
          {categories.length === 0 ? (
            <p className="surface px-4 py-3 text-sm text-muted-foreground">
              No hay categorías todavía.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
