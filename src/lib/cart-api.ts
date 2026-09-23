import type { Cart, CheckoutResult } from "@/lib/types";
import { authorizedFetch } from "@/lib/authorized-fetch";

export function getCart(token: string) {
  return authorizedFetch<Cart>(token, "/api/cart");
}

export function addCartItem(token: string, productId: string, quantity = 1) {
  return authorizedFetch<Cart>(token, "/api/cart/items", {
    method: "POST",
    body: JSON.stringify({ productId, quantity }),
  });
}

export function updateCartItem(token: string, productId: string, quantity: number) {
  return authorizedFetch<Cart>(token, `/api/cart/items/${productId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export function removeCartItem(token: string, productId: string) {
  return authorizedFetch<Cart>(token, `/api/cart/items/${productId}`, { method: "DELETE" });
}

export function checkout(token: string) {
  return authorizedFetch<CheckoutResult>(token, "/api/checkout", { method: "POST" });
}
