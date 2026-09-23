import type { Category, Product, ProductPage } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status} on ${path}`);
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
