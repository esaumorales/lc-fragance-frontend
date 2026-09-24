import { describe, expect, it, vi, beforeEach } from "vitest";
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

const categoria: Category = { id: "cat-1", name: "Perfumes", slug: "perfumes", parentId: null };

const producto: Product = {
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

describe("ProductAdminView: edición", () => {
  it("carga los datos del producto en el formulario", async () => {
    await abrirEdicion();

    expect(screen.getByLabelText("Nombre")).toHaveValue("Oud Real");
    expect(screen.getByLabelText("SKU")).toHaveValue("OUD-01");
    expect(screen.getByLabelText("Precio")).toHaveValue(250);
    expect(screen.getByLabelText("URL de la imagen")).toHaveValue("https://cdn.example.com/oud.jpg");
    expect(screen.getByLabelText("Marca")).toHaveValue("LC");
    expect(screen.getByLabelText("Notas olfativas (separadas por coma)")).toHaveValue("oud, ámbar");
  });

  it("guarda el nombre y la imagen nuevos con PATCH, no crea otro producto", async () => {
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

  // El stock se maneja con los botones de la lista; mandarlo al editar
  // pisaria cualquier ajuste hecho mientras el formulario estaba abierto.
  it("no manda el stock al editar", async () => {
    const user = await abrirEdicion();

    // Mientras se edita, el campo no esta: el stock vive en la lista.
    expect(screen.queryByLabelText("Stock inicial")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Guardar cambios/ }));

    await waitFor(() => expect(actualizar).toHaveBeenCalledOnce());
    expect(actualizar.mock.calls[0]![2]).not.toHaveProperty("stock");
  });

  it("cancelar deja el formulario limpio y vuelve a modo alta", async () => {
    const user = await abrirEdicion();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByLabelText("Nombre")).toHaveValue("");
    expect(screen.getByRole("button", { name: /Crear producto/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Stock inicial")).toBeInTheDocument();
  });

  it("sin editar nada, el formulario crea", async () => {
    const user = userEvent.setup();
    render(<ProductAdminView />);
    await screen.findByLabelText("Editar Oud Real");

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

describe("ProductAdminView: interacción", () => {
  it("muestra la vista previa de la imagen cargada", async () => {
    await abrirEdicion();
    expect(screen.getByAltText("Vista previa de la imagen")).toBeInTheDocument();
  });

  it("quitar imagen limpia el campo y la vista previa", async () => {
    const user = await abrirEdicion();
    await user.click(screen.getByRole("button", { name: "Quitar imagen" }));

    expect(screen.getByLabelText("URL de la imagen")).toHaveValue("");
    expect(screen.queryByAltText("Vista previa de la imagen")).toBeNull();
  });

  it("filtra la lista por nombre y avisa si no hay coincidencias", async () => {
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

  // Borrar sin preguntar, o preguntando con un cuadro del navegador, es peor:
  // la confirmación vive en la misma fila.
  it("eliminar pide confirmación antes de borrar", async () => {
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
