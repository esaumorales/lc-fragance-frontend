import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PedidosAdminView } from "@/components/organisms/PedidosAdminView";
import type { Pedido } from "@/lib/types";

vi.mock("@iconify/react", () => ({ Icon: ({ icon }: { icon: string }) => <span data-icon={icon} /> }));

const { listar, confirmar, cancelar, avanzar } = vi.hoisted(() => ({
  listar: vi.fn(),
  confirmar: vi.fn(),
  cancelar: vi.fn(),
  avanzar: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ accessToken: "un-token" }) }));
vi.mock("@/lib/pedidos-api", () => ({
  listarPedidos: listar,
  confirmarPedido: confirmar,
  cancelarPedido: cancelar,
  avanzarPedido: avanzar,
}));

function pedido(status: Pedido["status"], id = "aaaaaaaa-1111-2222-3333-444444444444"): Pedido {
  return {
    id,
    status,
    total: "90.00",
    createdAt: "2026-09-24T10:00:00.000Z",
    user: { id: "u-1", name: "Cliente Prueba", email: "cliente@example.com" },
    items: [
      {
        id: "i-1",
        quantity: 2,
        unitPrice: "45.00",
        product: { id: "p-1", name: "Oud Real", sku: "OUD-01", stock: 7 },
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  listar.mockResolvedValue([pedido("PENDING")]);
});

describe("PedidosAdminView", () => {
  it("arranca mostrando los que faltan confirmar", async () => {
    render(<PedidosAdminView />);

    await waitFor(() => expect(listar).toHaveBeenCalledWith("un-token", "PENDING"));
    expect(await screen.findByText(/Cliente Prueba/)).toBeInTheDocument();
    expect(screen.getByText(/2× Oud Real/)).toBeInTheDocument();
  });

  it("confirmar descuenta el stock y lo dice", async () => {
    const user = userEvent.setup();
    confirmar.mockResolvedValue(pedido("PAID"));
    render(<PedidosAdminView />);

    await user.click(await screen.findByRole("button", { name: /Confirmar compra/ }));

    await waitFor(() =>
      expect(confirmar).toHaveBeenCalledWith("un-token", "aaaaaaaa-1111-2222-3333-444444444444")
    );
    expect(await screen.findByText(/el stock ya se descontó/)).toBeInTheDocument();
  });

  // Entre el checkout y la confirmación pueden haber vendido lo mismo a otro.
  it("muestra el motivo si el stock ya no alcanza", async () => {
    const user = userEvent.setup();
    confirmar.mockRejectedValue(new Error("No alcanza el stock para: Oud Real (pide 2, hay 1)"));
    render(<PedidosAdminView />);

    await user.click(await screen.findByRole("button", { name: /Confirmar compra/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("pide 2, hay 1");
  });

  it("un pendiente no ofrece marcarlo enviado: primero hay que confirmarlo", async () => {
    render(<PedidosAdminView />);
    await screen.findByRole("button", { name: /Confirmar compra/ });

    expect(screen.queryByRole("button", { name: /Marcar enviado/ })).toBeNull();
  });

  it("uno confirmado ofrece enviarlo y ya no confirmarlo de nuevo", async () => {
    listar.mockResolvedValue([pedido("PAID")]);
    render(<PedidosAdminView />);

    expect(await screen.findByRole("button", { name: /Marcar enviado/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirmar compra/ })).toBeNull();
  });

  it("cancelar un pendiente avisa sin hablar de stock devuelto", async () => {
    const user = userEvent.setup();
    cancelar.mockResolvedValue(pedido("CANCELLED"));
    render(<PedidosAdminView />);

    await user.click(await screen.findByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(cancelar).toHaveBeenCalledOnce());
    expect(await screen.findByText("Pedido cancelado.")).toBeInTheDocument();
  });

  it("cancelar uno confirmado avisa que el stock vuelve", async () => {
    const user = userEvent.setup();
    listar.mockResolvedValue([pedido("PAID")]);
    cancelar.mockResolvedValue(pedido("CANCELLED"));
    render(<PedidosAdminView />);

    await user.click(await screen.findByRole("button", { name: "Cancelar" }));

    expect(await screen.findByText(/volvió al inventario/)).toBeInTheDocument();
  });

  it("uno cancelado no ofrece ninguna acción", async () => {
    listar.mockResolvedValue([pedido("CANCELLED")]);
    render(<PedidosAdminView />);
    await screen.findByText(/Cliente Prueba/);

    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Confirmar compra/ })).toBeNull();
  });

  it("el filtro Todos pide la lista sin estado", async () => {
    const user = userEvent.setup();
    render(<PedidosAdminView />);
    await screen.findByText(/Cliente Prueba/);

    await user.click(screen.getByRole("button", { name: "Todos" }));

    await waitFor(() => expect(listar).toHaveBeenCalledWith("un-token", undefined));
  });
});
