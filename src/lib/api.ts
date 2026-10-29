import type { Category, Product, ProductPage } from "@/lib/types";
import { API_BASE } from "@/lib/api-base";

/**
 * Un fallo de la API, con su codigo.
 *
 * Sin el codigo, quien llama no puede distinguir "esto no existe" de "la API
 * no contesta", y las dos cosas terminan en la misma pantalla.
 */
export class ErrorDeApi extends Error {
  constructor(
    readonly status: number,
    readonly path: string
  ) {
    super(`API error ${status} on ${path}`);
    this.name = "ErrorDeApi";
  }

  /** Lo que se pidio no existe. Cualquier otro codigo es un problema nuestro. */
  get noExiste(): boolean {
    return this.status === 404;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    throw new ErrorDeApi(res.status, path);
  }

  return res.json() as Promise<T>;
}

export function fetchCategories() {
  return apiFetch<Category[]>("/api/categories");
}

export function fetchCategory(slug: string) {
  return apiFetch<Category>(`/api/categories/${slug}`);
}

export type ProductFilters = {
  category?: string;
  q?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
};

/**
 * Los filtros viajan tal cual a la query. El backend los valida con Zod y
 * responde 400 si algo no cuadra, asi que aca no se duplica esa validacion:
 * un valor invalido tiene que fallar en un solo lugar.
 */
export function fetchProducts(filters: ProductFilters = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") query.set(key, value);
  }
  const suffix = query.size > 0 ? `?${query}` : "";
  return apiFetch<ProductPage>(`/api/products${suffix}`);
}

export function fetchProduct(slug: string) {
  return apiFetch<Product>(`/api/products/${slug}`);
}
