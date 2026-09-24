// Los importes se guardan como decimales y ya estan en la moneda que se cobra:
// esto solo les pone formato, no convierte nada.
const FORMATO = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

export function precio(valor: string | number | null | undefined): string {
  const numero = typeof valor === "string" ? Number(valor) : valor;
  if (numero === null || numero === undefined || !Number.isFinite(numero)) {
    return "—";
  }
  // Intl separa el simbolo con un espacio duro: se ve igual, pero rompe
  // cualquier busqueda por texto y se copia raro.
  return FORMATO.format(numero).replace(/ /g, " ");
}
