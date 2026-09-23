import type { Category, Product } from "@/lib/types";
import { authorizedFetch } from "@/lib/authorized-fetch";

export type CategoryInput = { name: string; slug: string; parentId?: string };

export function createCategory(token: string, data: CategoryInput) {
  return authorizedFetch<Category>(token, "/api/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteCategory(token: string, id: string) {
  return authorizedFetch<void>(token, `/api/categories/${id}`, { method: "DELETE" });
}

export type ProductInput = {
  name: string;
  slug: string;
  description: string;
  price: number;
  sku: string;
  stock: number;
  categoryId: string;
  images?: string[];
  attributes?: Record<string, unknown>;
};

export function createProduct(token: string, data: ProductInput) {
  return authorizedFetch<Product>(token, "/api/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateProduct(token: string, id: string, data: Partial<ProductInput>) {
  return authorizedFetch<Product>(token, `/api/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteProduct(token: string, id: string) {
  return authorizedFetch<void>(token, `/api/products/${id}`, { method: "DELETE" });
}

export function adjustStock(
  token: string,
  id: string,
  change: number,
  reason: "restock" | "manual_adjustment"
) {
  return authorizedFetch<Product>(token, `/api/products/${id}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ change, reason }),
  });
}
