import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthForm } from "@/components/organisms/AuthForm";
const { login, register, push } = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ login, register }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
beforeEach(() => vi.clearAllMocks());
describe("AuthForm", () => {
  it("signs in and closes the modal without losing the current page", async () => {
    login.mockResolvedValue(undefined);
    const close = vi.fn(); const user = userEvent.setup();
    render(<AuthForm variant="login" onSuccess={close} />);
    await user.type(screen.getByLabelText("Correo electrónico"), "cliente@example.com");
    await user.type(screen.getByPlaceholderText("Tu contraseña"), "short");
    await user.click(screen.getByRole("button", {name:"Iniciar sesión"}));
    expect(login).toHaveBeenCalledWith("cliente@example.com", "short");
    expect(close).toHaveBeenCalledOnce(); expect(push).not.toHaveBeenCalled();
  });
  it("shows server errors and keeps the form open", async () => {
    login.mockRejectedValue(new Error("Credenciales inválidas"));
    const close = vi.fn(); const user = userEvent.setup();
    render(<AuthForm variant="login" onSuccess={close} />);
    await user.type(screen.getByLabelText("Correo electrónico"), "cliente@example.com");
    await user.type(screen.getByPlaceholderText("Tu contraseña"), "wrongpass");
    await user.click(screen.getByRole("button", {name:"Iniciar sesión"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("Credenciales inválidas");
    expect(close).not.toHaveBeenCalled();
  });
  it("registers and supports showing the password", async () => {
    register.mockResolvedValue(undefined);
    const user = userEvent.setup(); const close = vi.fn();
    render(<AuthForm variant="register" onSuccess={close} />);
    await user.type(screen.getByLabelText("Nombre completo"), "Cliente LC");
    await user.type(screen.getByLabelText("Correo electrónico"), "cliente@example.com");
    const password = screen.getByPlaceholderText("Mínimo 8 caracteres");
    await user.type(password, "secret123");
    await user.click(screen.getByRole("button", {name:"Mostrar"}));
    expect(password).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", {name:"Crear mi cuenta"}));
    expect(register).toHaveBeenCalledWith("Cliente LC", "cliente@example.com", "secret123");
    expect(close).toHaveBeenCalledOnce();
  });
});
