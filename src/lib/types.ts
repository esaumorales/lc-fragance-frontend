export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  sku: string;
  stock: number;
  images: string[];
  model3dUrl: string | null;
  attributes: Record<string, unknown>;
  isActive: boolean;
  categoryId: string;
};

export type ProductPage = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
};

export type Cart = {
  id: string;
  userId: string;
  items: CartItem[];
};

export type CheckoutResult = {
  order: { id: string; status: string; total: string };
  whatsappUrl: string | null;
  yape: { phone: string; name: string };
};
