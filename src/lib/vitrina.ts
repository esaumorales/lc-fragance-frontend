// La geometria de la vitrina, sin DOM: asi se prueba sola.

/** Cuanto se recorrio de una seccion alta y pegada, de 0 a 1. */
export function progresoDeSeccion(arriba: number, alto: number, alturaVentana: number): number {
  const recorrido = alto - alturaVentana;
  if (recorrido <= 0) return 0;
  return Math.min(1, Math.max(0, -arriba / recorrido));
}

/**
 * En que pieza esta parada la vitrina, con decimales.
 *
 * Es fraccionario a proposito: entre una pieza y la siguiente la fila tiene
 * que estar a mitad de camino, no saltar.
 */
export function avance(progreso: number, cantidad: number): number {
  if (cantidad <= 1) return 0;
  return Math.min(1, Math.max(0, progreso)) * (cantidad - 1);
}

export function piezaCentrada(progreso: number, cantidad: number): number {
  if (cantidad <= 0) return 0;
  return Math.min(cantidad - 1, Math.max(0, Math.round(avance(progreso, cantidad))));
}

export type Colocacion = {
  /** Desplazamiento lateral, en porcentaje del ancho de una pieza. */
  x: number;
  /** Acercamiento a la camara, en px; negativo es mas lejos. */
  z: number;
  /** Giro sobre su eje, en grados. */
  giro: number;
  opacidad: number;
  /** Si se puede tocar. Las transparentes siguen en el arbol de
   *  accesibilidad, pero no deben interceptar el clic. */
  alcanzable: boolean;
};

export type FormaDelArco = {
  /** Separacion angular entre piezas vecinas, en radianes. */
  paso: number;
  /** Radio del arco en px: cuanto se hunden las de los costados. */
  radio: number;
  /** Cuantas piezas a cada lado del centro llegan a verse. */
  alcance: number;
};

export const ARCO: FormaDelArco = { paso: 0.58, radio: 610, alcance: 2.8 };

/**
 * Perspectiva del CSS, en px, derivada del radio.
 *
 * Es lo que decide cuanto se achica una pieza al irse al fondo. Lejana, la
 * fila queda plana por mas que las piezas se hundan; esta cerca a proposito.
 */
export const PERSPECTIVA = Math.round(ARCO.radio * 1.45);

/** Fotograma más cercano al ángulo actual; evita superponer dos siluetas. */
export function fotogramaParaDistancia(distancia: number): number {
  // Quince fotos: pasos de 4° y 10° cerca del frente, luego 12/16/20/25°.
  const posicion = Math.min(14, Math.max(0, 7 + distancia * 7));
  return Math.round(posicion);
}

/**
 * Donde va una pieza segun su distancia al centro de la vitrina.
 *
 * Las piezas se acomodan sobre un arco mirando a la camara: las de los lados
 * se van hacia atras y giran, y la perspectiva del CSS se encarga de
 * achicarlas. Son fotos planas; la profundidad la da la colocacion, no el
 * objeto.
 */
export function colocar(distancia: number, forma: FormaDelArco = ARCO): Colocacion {
  const angulo = distancia * forma.paso;
  const lejania = Math.abs(distancia);

  return {
    x: Math.sin(angulo) * forma.radio,
    z: (Math.cos(angulo) - 1) * forma.radio,
    // Las fotos son planos: un giro discreto sugiere volumen sin mostrar su canto.
    giro: ((-angulo * 180) / Math.PI) * 0.22,
    // El extremo se desvanece antes de reaparecer al otro lado del círculo.
    opacidad: lejania <= 2
      ? 1 - lejania * 0.12
      : Math.max(0, 0.76 * (forma.alcance - lejania) / (forma.alcance - 2)),
    alcanzable: lejania < forma.alcance,
  };
}

/** Las de atras se pintan primero: el z-index tiene que seguir al arco. */
export function capa(distancia: number, forma: FormaDelArco = ARCO): number {
  return Math.round((forma.alcance + 1 - Math.abs(distancia)) * 10);
}
