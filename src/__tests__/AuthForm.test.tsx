import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthForm } from "@/components/organisms/AuthForm";
const { login, completarCodigo, register, push, olvide } = vi.hoisted(() => ({ login: vi.fn(), completarCodigo: vi.fn(), register: vi.fn(), push: vi.fn(), olvide: vi.fn() }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ login, completarCodigo, register }) }));
vi.mock("@/lib/auth-api", () => ({ olvideRequest: olvide }));
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

  it("pide el código cuando la cuenta es del panel, sin abrir sesión", async () => {
    login.mockResolvedValue({ requiereCodigo: true, desafioId: "d1", correoEnviado: true });
    const close = vi.fn(); const user = userEvent.setup();
    render(<AuthForm variant="login" onSuccess={close} />);
    await user.type(screen.getByLabelText("Correo electrónico"), "duenio@example.com");
    await user.type(screen.getByPlaceholderText("Tu contraseña"), "correcta");
    await user.click(screen.getByRole("button", {name:"Iniciar sesión"}));
    expect(await screen.findByLabelText("Código de acceso")).toBeInTheDocument();
    expect(close).not.toHaveBeenCalled();
  });
  it("entra al completar el código", async () => {
    login.mockResolvedValue({ requiereCodigo: true, desafioId: "d1", correoEnviado: true });
    completarCodigo.mockResolvedValue(undefined);
    const close = vi.fn(); const user = userEvent.setup();
    render(<AuthForm variant="login" onSuccess={close} />);
    await user.type(screen.getByLabelText("Correo electrónico"), "duenio@example.com");
    await user.type(screen.getByPlaceholderText("Tu contraseña"), "correcta");
    await user.click(screen.getByRole("button", {name:"Iniciar sesión"}));
    await user.type(await screen.findByLabelText("Código de acceso"), "123456");
    await user.click(screen.getByRole("button", {name:"Entrar"}));
    expect(completarCodigo).toHaveBeenCalledWith("d1", "123456");
    expect(close).toHaveBeenCalledOnce();
  });
  it("no deja enviar un código incompleto", async () => {
    login.mockResolvedValue({ requiereCodigo: true, desafioId: "d1", correoEnviado: true });
    const user = userEvent.setup();
    render(<AuthForm variant="login" onSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText("Correo electrónico"), "duenio@example.com");
    await user.type(screen.getByPlaceholderText("Tu contraseña"), "correcta");
    await user.click(screen.getByRole("button", {name:"Iniciar sesión"}));
    await user.type(await screen.findByLabelText("Código de acceso"), "123");
    expect(screen.getByRole("button", {name:"Entrar"})).toBeDisabled();
  });
  it("descarta lo que no sean dígitos en el código", async () => {
    login.mockResolvedValue({ requiereCodigo: true, desafioId: "d1", correoEnviado: true });
    const user = userEvent.setup();
    render(<AuthForm variant="login" onSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText("Correo electrónico"), "duenio@example.com");
    await user.type(screen.getByPlaceholderText("Tu contraseña"), "correcta");
    await user.click(screen.getByRole("button", {name:"Iniciar sesión"}));
    const campo = await screen.findByLabelText("Código de acceso");
    await user.type(campo, "12ab34cd56");
    expect(campo).toHaveValue("123456");
  });
  it("avisa cuando el servidor no pudo mandar el correo", async () => {
    login.mockResolvedValue({ requiereCodigo: true, desafioId: "d1", correoEnviado: false });
    const user = userEvent.setup();
    render(<AuthForm variant="login" onSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText("Correo electrónico"), "duenio@example.com");
    await user.type(screen.getByPlaceholderText("Tu contraseña"), "correcta");
    await user.click(screen.getByRole("button", {name:"Iniciar sesión"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("el código no salió");
  });
});
