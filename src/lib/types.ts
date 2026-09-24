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
  role: "CUSTOMER" | "ADMIN" | "SUPERADMIN";
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

// Un admin no recibe sesion al acertar la contraseña: recibe esto y tiene que
// completar el codigo que le llega al correo.
export type DesafioSegundoFactor = {
  requiereCodigo: true;
  desafioId: string;
  correoEnviado: boolean;
};

export type ResultadoDeLogin = AuthResponse | DesafioSegundoFactor;

export type RolDeUsuario = "CUSTOMER" | "ADMIN" | "SUPERADMIN";

export type Administrador = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SUPERADMIN";
  isActive: boolean;
  createdAt: string;
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

export type Direccion = {
  recipient: string | null;
  phone: string | null;
  street: string;
  reference: string | null;
  district: string;
  city: string;
  region: string | null;
  postalCode: string | null;
};

export type EstadoPedido = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export type Pedido = {
  id: string;
  status: EstadoPedido;
  total: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  items: {
    id: string;
    quantity: number;
    unitPrice: string;
    product: { id: string; name: string; sku: string; stock: number };
  }[];
};
