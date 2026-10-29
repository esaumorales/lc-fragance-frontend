export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  /** Productos en la categoria y en sus subcategorias. */
  productCount: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  /** Oferta: precio rebajado y desde cuando hasta cuando rige. */
  offerPrice?: string | null;
  offerStartsAt?: string | null;
  offerEndsAt?: string | null;
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

export type MetodoDePago = "YAPE" | "TRANSFERENCIA";
export type TipoDeEntrega = "RECOJO" | "DELIVERY";

/** Los datos de cobro de la tienda, tal como los ve quien compra. */
export type DatosDeCobro = {
  titular: string | null;
  yape: string | null;
  banco: string | null;
  cuenta: string | null;
  cci: string | null;
  metodos: MetodoDePago[];
  entregas: TipoDeEntrega[];
  costoDelivery: string;
  /** Null cuando se puede comprar; si no, por que no. */
  motivo: string | null;
};

/** Todo lo del panel, incluido lo que no sale al publico. */
export type ConfiguracionDePago = {
  titular: string | null;
  yape: string | null;
  banco: string | null;
  cuenta: string | null;
  cci: string | null;
  correoDeAvisos: string | null;
  recojoActivo: boolean;
  deliveryActivo: boolean;
  costoDelivery: string;
};

export type CheckoutResult = {
  order: {
    id: string;
    status: string;
    total: string;
    nombre: string;
    correo: string;
    entrega: TipoDeEntrega;
    costoEnvio: string;
  };
  whatsappUrl: string | null;
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
  latitude: number | null;
  longitude: number | null;
};

export type EstadoPedido = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export type Pedido = {
  id: string;
  status: EstadoPedido;
  total: string;
  createdAt: string;

  // Van en el pedido y no en la cuenta: tambien compra quien no tiene una.
  nombre: string;
  correo: string;
  celular: string;
  /** Null en los pedidos anteriores a que se pidiera. */
  dni: string | null;
  metodoPago: MetodoDePago;
  voucherUrl: string | null;
  entrega: TipoDeEntrega;
  direccion: string | null;
  costoEnvio: string;
  nota: string | null;
  plazo: string | null;

  /** Null cuando compro sin cuenta. */
  user: { id: string; name: string; email: string } | null;
  items: {
    id: string;
    quantity: number;
    unitPrice: string;
    product: { id: string; name: string; sku: string; stock: number };
  }[];
};
