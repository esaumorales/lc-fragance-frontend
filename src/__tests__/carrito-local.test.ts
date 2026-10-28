import { describe, expect, it, vi } from "vitest";
import {
  agregar,
  cambiarCantidad,
  contar,
  guardarCarrito,
  leerCarrito,
  paraElPedido,
  quitar,
  vaciar,
  type ItemLocal,
} from "@/lib/carrito-local";

function item(productId: string, quantity = 1): ItemLocal {
  return { productId, slug: productId, name: `Perfume ${productId}`, price: "100.00", quantity };
}

/** Un localStorage de mentira, para no depender del navegador. */
function almacenFalso(inicial: string | null = null) {
  let guardado = inicial;
  return {
    getItem: () => guardado,
    setItem: (_clave: string, valor: string) => {
      guardado = valor;
    },
    removeItem: () => {
      guardado = null;
    },
    get contenido() {
      return guardado;
    },
  };
}

describe("agregar", () => {
  it("mete el producto si no estaba", () => {
    expect(agregar([], item("a", 2))).toHaveLength(1);
  });

  // Agregar dos veces lo mismo es querer dos, no dos renglones iguales.
  it("suma a lo que ya había en vez de duplicar el renglón", () => {
    const carrito = agregar([item("a", 2)], item("a", 3));

    expect(carrito).toHaveLength(1);
    expect(carrito[0]!.quantity).toBe(5);
  });

  it("no deja pasar del tope por producto", () => {
    expect(agregar([item("a", 95)], item("a", 20), 99)[0]!.quantity).toBe(99);
  });

  it("no toca los otros productos", () => {
    const carrito = agregar([item("a", 1), item("b", 4)], item("a", 1));

    expect(carrito.find((i) => i.productId === "b")!.quantity).toBe(4);
  });
});

describe("cambiar la cantidad", () => {
  it("la reemplaza, no la suma", () => {
    expect(cambiarCantidad([item("a", 5)], "a", 2)[0]!.quantity).toBe(2);
  });

  // Bajar a cero desde el carrito es sacarlo: pedir un "0x" no existe.
  it("en cero, el producto sale del carrito", () => {
    expect(cambiarCantidad([item("a", 1), item("b", 1)], "a", 0)).toHaveLength(1);
  });

  it("un número negativo también lo saca", () => {
    expect(cambiarCantidad([item("a", 1)], "a", -3)).toEqual([]);
  });

  it("respeta el tope", () => {
    expect(cambiarCantidad([item("a", 1)], "a", 500, 99)[0]!.quantity).toBe(99);
  });
});

describe("quitar y vaciar", () => {
  it("quita solo el que se pide", () => {
    expect(quitar([item("a"), item("b")], "a").map((i) => i.productId)).toEqual(["b"]);
  });

  it("vaciar borra lo guardado", () => {
    const almacen = almacenFalso(JSON.stringify([item("a")]));

    vaciar(almacen);

    expect(almacen.contenido).toBeNull();
  });
});

describe("lo que queda guardado", () => {
  it("se puede volver a leer igual", () => {
    const almacen = almacenFalso();

    guardarCarrito([item("a", 3)], almacen);

    expect(leerCarrito(almacen)).toEqual([item("a", 3)]);
  });

  it("sin nada guardado, el carrito está vacío", () => {
    expect(leerCarrito(almacenFalso())).toEqual([]);
  });

  // Lo guardado lo puede tocar cualquiera desde las herramientas del navegador.
  it("no se rompe con basura adentro", () => {
    expect(leerCarrito(almacenFalso("esto no es json"))).toEqual([]);
    expect(leerCarrito(almacenFalso('{"no":"es una lista"}'))).toEqual([]);
  });

  it("descarta los renglones con forma inválida", () => {
    const mezcla = JSON.stringify([item("a"), { productId: "b" }, { quantity: 2 }]);

    expect(leerCarrito(almacenFalso(mezcla))).toHaveLength(1);
  });

  it("descarta cantidades que no son número positivo", () => {
    const raro = JSON.stringify([{ ...item("a"), quantity: 0 }, { ...item("b"), quantity: -1 }]);

    expect(leerCarrito(almacenFalso(raro))).toEqual([]);
  });

  // En una ventana privada, tocar localStorage lanza. El carrito no puede
  // tirar abajo la página por eso.
  it("aguanta un almacén que lanza al leer", () => {
    const roto = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    expect(leerCarrito(roto)).toEqual([]);
    expect(() => guardarCarrito([item("a")], roto)).not.toThrow();
  });

  it("sin almacén tampoco falla", () => {
    expect(leerCarrito(null)).toEqual([]);
    expect(() => guardarCarrito([item("a")], null)).not.toThrow();
  });
});

describe("contar y armar el pedido", () => {
  it("cuenta unidades, no renglones", () => {
    expect(contar([item("a", 3), item("b", 2)])).toBe(5);
  });

  // El precio lo pone el servidor: mandarlo desde acá sería dejar que el
  // navegador elija cuánto paga.
  it("al pedido solo viajan el producto y la cantidad", () => {
    expect(paraElPedido([item("a", 2)])).toEqual([{ productId: "a", quantity: 2 }]);
  });
});
