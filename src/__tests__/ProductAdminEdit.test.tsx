import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductAdminView } from "@/components/organisms/ProductAdminView";
import type { Category, Product } from "@/lib/types";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));
vi.mock("@iconify/react", () => ({ Icon: ({ icon }: { icon: string }) => <span data-icon={icon} /> }));

const { crear, actualizar, borrar, ajustar, listarProductos, listarCategorias } = vi.hoisted(() => ({
  crear: vi.fn(),
  actualizar: vi.fn(),
  borrar: vi.fn(),
  ajustar: vi.fn(),
  listarProductos: vi.fn(),
  listarCategorias: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ accessToken: "un-token" }) }));
vi.mock("@/lib/upload-api", () => ({ subirImagen: vi.fn() }));
vi.mock("@/lib/api", () => ({ fetchProducts: listarProductos, fetchCategories: listarCategorias }));
vi.mock("@/lib/admin-api", () => ({
  createProduct: crear,
  updateProduct: actualizar,
  deleteProduct: borrar,
  adjustStock: ajustar,
}));

// jsdom no implementa el comportamiento del <dialog>.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

const categoria: Category = { id: "cat-1", name: "Perfumes", slug: "perfumes", parentId: null };

const producto = {
  id: "prod-1",
  name: "Oud Real",
  slug: "oud-real",
  description: "Madera y ámbar",
  price: "250.00",
  sku: "OUD-01",
  stock: 7,
  images: ["https://cdn.example.com/oud.jpg"],
  model3dUrl: null,
  attributes: { notasOlfativas: ["oud", "ámbar"], marca: "LC" },
  isActive: true,
  categoryId: "cat-1",
} as Product;

beforeEach(() => {
  vi.clearAllMocks();
  listarProductos.mockResolvedValue({ items: [producto] });
  listarCategorias.mockResolvedValue([categoria]);
});

async function abrirEdicion() {
  const user = userEvent.setup();
  render(<ProductAdminView />);
  await user.click(await screen.findByLabelText("Editar Oud Real"));
  return user;
}

describe("ProductAdminView: edición en una ventana", () => {
  it("la fila entera abre la ventana con los datos cargados", async () => {
    await abrirEdicion();

    expect(screen.getByRole("heading", { name: "Oud Real" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Oud Real");
    expect(screen.getByLabelText("SKU")).toHaveValue("OUD-01");
    expect(screen.getByLabelText("Precio")).toHaveValue(250);
    expect(screen.getByLabelText("Marca")).toHaveValue("LC");
    expect(screen.getByLabelText("Notas olfativas (separadas por coma)")).toHaveValue("oud, ámbar");
    expect(screen.getByAltText("Vista previa de la imagen")).toBeInTheDocument();
  });

  it("guarda el nombre y la imagen nuevos con PATCH, sin crear otro producto", async () => {
    const user = await abrirEdicion();

    const nombre = screen.getByLabelText("Nombre");
    await user.clear(nombre);
    await user.type(nombre, "Oud Real Intenso");

    const imagen = screen.getByLabelText("URL de la imagen");
    await user.clear(imagen);
    await user.type(imagen, "https://cdn.example.com/nueva.jpg");

    await user.click(screen.getByRole("button", { name: /Guardar cambios/ }));

    await waitFor(() => expect(actualizar).toHaveBeenCalledOnce());
    const [token, id, datos] = actualizar.mock.calls[0]!;
    expect(token).toBe("un-token");
    expect(id).toBe("prod-1");
    expect(datos.name).toBe("Oud Real Intenso");
    expect(datos.images).toEqual(["https://cdn.example.com/nueva.jpg"]);
    expect(crear).not.toHaveBeenCalled();
  });

  // El stock se ajusta desde la lista; mandarlo al editar pisaría cualquier
  // cambio hecho mientras la ventana estaba abierta.
  it("al editar no pide stock ni lo manda", async () => {
    const user = await abrirEdicion();
    expect(screen.queryByLabelText("Stock inicial")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Guardar cambios/ }));

    await waitFor(() => expect(actualizar).toHaveBeenCalledOnce());
    expect(actualizar.mock.calls[0]![2]).not.toHaveProperty("stock");
  });

  it("quitar deja el producto sin imagen", async () => {
    const user = await abrirEdicion();
    await user.click(screen.getByRole("button", { name: "Quitar" }));

    expect(screen.queryByAltText("Vista previa de la imagen")).toBeNull();
    expect(screen.getByLabelText("URL de la imagen")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: /Guardar cambios/ }));
    await waitFor(() => expect(actualizar.mock.calls[0]![2].images).toEqual([]));
  });

  it("cancelar cierra la ventana sin guardar", async () => {
    const user = await abrirEdicion();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText("Nombre")).toBeNull();
    expect(actualizar).not.toHaveBeenCalled();
  });
});

describe("ProductAdminView: alta", () => {
  it("el botón de nuevo abre la ventana vacía y crea con stock", async () => {
    const user = userEvent.setup();
    render(<ProductAdminView />);
    await user.click(await screen.findByRole("button", { name: /Nuevo producto/ }));

    expect(screen.getByLabelText("Nombre")).toHaveValue("");
    expect(screen.getByLabelText("Stock inicial")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nombre"), "Nuevo");
    await user.type(screen.getByLabelText("SKU"), "NEW-01");
    await user.type(screen.getByLabelText("Precio"), "10");
    await user.type(screen.getByLabelText("Descripción"), "algo");
    await user.click(screen.getByRole("button", { name: /Crear producto/ }));

    await waitFor(() => expect(crear).toHaveBeenCalledOnce());
    expect(actualizar).not.toHaveBeenCalled();
    expect(crear.mock.calls[0]![1]).toHaveProperty("stock");
  });
});

describe("ProductAdminView: lista", () => {
  it("filtra por nombre y avisa si no hay coincidencias", async () => {
    const user = userEvent.setup();
    render(<ProductAdminView />);
    const buscador = await screen.findByLabelText("Buscar por nombre o SKU");

    await user.type(buscador, "oud");
    expect(screen.getByLabelText("Editar Oud Real")).toBeInTheDocument();

    await user.clear(buscador);
    await user.type(buscador, "zapatillas");
    expect(screen.queryByLabelText("Editar Oud Real")).toBeNull();
    expect(screen.getByText(/Ningún producto coincide/)).toBeInTheDocument();
  });

  it("también filtra por SKU", async () => {
    const user = userEvent.setup();
    render(<ProductAdminView />);
    await user.type(await screen.findByLabelText("Buscar por nombre o SKU"), "OUD-01");
    expect(screen.getByLabelText("Editar Oud Real")).toBeInTheDocument();
  });

  it("eliminar pide confirmación en la misma fila", async () => {
    const user = userEvent.setup();
    render(<ProductAdminView />);
    await user.click(await screen.findByLabelText("Eliminar Oud Real"));

    expect(borrar).not.toHaveBeenCalled();
    expect(screen.getByText("¿Eliminar?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sí" }));
    await waitFor(() => expect(borrar).toHaveBeenCalledWith("un-token", "prod-1"));
  });

  it("decir que no cancela el borrado", async () => {
    const user = userEvent.setup();
    render(<ProductAdminView />);
    await user.click(await screen.findByLabelText("Eliminar Oud Real"));
    await user.click(screen.getByRole("button", { name: "No" }));

    expect(borrar).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Eliminar Oud Real")).toBeInTheDocument();
  });
});
