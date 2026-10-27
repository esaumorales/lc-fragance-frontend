import { describe, expect, it } from "vitest";
import { filtrosPara, tarjetasPara } from "@/lib/visibilidad-usuarios";

describe("filtrosPara", () => {
  it("el dueño elige entre los tres roles y el total", () => {
    expect(filtrosPara("SUPERADMIN").map((f) => f.id)).toEqual([
      "TODOS",
      "CUSTOMER",
      "ADMIN",
      "SUPERADMIN",
    ]);
  });

  // Un administrador solo ve administradores: una pestaña sola no es una
  // elección, y las otras devolverían vacío.
  it("un administrador no tiene pestañas para elegir", () => {
    expect(filtrosPara("ADMIN")).toEqual([]);
  });

  it("sin sesión tampoco hay pestañas", () => {
    expect(filtrosPara(undefined)).toEqual([]);
  });
});

describe("tarjetasPara", () => {
  it("el dueño ve el total y los tres roles", () => {
    expect(tarjetasPara("SUPERADMIN")).toEqual(["TOTAL", "CUSTOMER", "ADMIN", "SUPERADMIN"]);
  });

  // Cuántos clientes o cuántos dueños hay también es información.
  it("un administrador solo ve cuántos administradores hay", () => {
    expect(tarjetasPara("ADMIN")).toEqual(["ADMIN"]);
  });

  it("un administrador no ve el total ni los clientes ni los superadmin", () => {
    const tarjetas = tarjetasPara("ADMIN");
    expect(tarjetas).not.toContain("TOTAL");
    expect(tarjetas).not.toContain("CUSTOMER");
    expect(tarjetas).not.toContain("SUPERADMIN");
  });
});
