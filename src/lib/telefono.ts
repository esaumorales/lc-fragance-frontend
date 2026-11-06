// Las mismas reglas que el backend: lo que se ve tiene que coincidir con lo
// que se acepta al guardar.

/**
 * Lo minimo para que wa.me encuentre a alguien.
 *
 * Necesita el numero internacional: codigo de pais mas el local, sin el "+".
 * Un movil peruano son 9 digitos, asi que exigir 10 obliga a poner el codigo
 * y atrapa el error mas facil de cometer.
 */
export const MINIMO_DIGITOS = 10;

export function soloDigitos(valor: string | null | undefined): string {
  return valor ? valor.replace(/\D/g, "") : "";
}

/** Que le falta al numero, en palabras. Null si esta bien o si esta vacio. */
export function motivoDelTelefono(valor: string | null | undefined): string | null {
  const digitos = soloDigitos(valor);
  if (digitos.length === 0) return null;

  if (digitos.length < MINIMO_DIGITOS) {
    return "Falta el código del país. Por ejemplo: +51 974 732 528";
  }
  if (digitos.length > 15) {
    return "Ese número tiene demasiados dígitos";
  }
  return null;
}

/** El enlace tal como va a quedar, para poder mostrarlo antes de guardar. */
export function enlaceDeWhatsapp(valor: string | null | undefined): string | null {
  const digitos = soloDigitos(valor);
  return digitos.length >= MINIMO_DIGITOS ? `wa.me/${digitos}` : null;
}
