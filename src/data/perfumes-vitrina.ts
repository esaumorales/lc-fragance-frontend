/**
 * La vitrina del heroe: cada entrada es un frasco de la fila.
 *
 * Selección de seis productos reales para la demostración de la vitrina.
 * El primero queda centrado cuando se abre la página.
 */

export type PerfumeDeVitrina = {
  /** Vista frontal, ruta dentro de public/. */
  imagen: string;
  /** Once ángulos ordenados, de derecha a izquierda; el centro es frontal. */
  vistas: readonly string[];
  nombre: string;
  /** Las notas, en dos o tres palabras: va debajo del nombre. */
  nota: string;
  detalle: string;
  /** A donde lleva el frasco al tocarlo. */
  href: string;
};

function secuencia(base: string): readonly string[] {
  const ruta = `/hero/perfumes/${base}`;
  return [
    `${ruta}-right.webp`,
    `${ruta}-right20.webp`,
    `${ruta}-right16.webp`,
    `${ruta}-right12.webp`,
    `${ruta}-right08.webp`,
    `${ruta}.webp`,
    `${ruta}-left08.webp`,
    `${ruta}-left12.webp`,
    `${ruta}-left16.webp`,
    `${ruta}-left20.webp`,
    `${ruta}-left.webp`,
  ];
}

export const PERFUMES_VITRINA: PerfumeDeVitrina[] = [
  { imagen: "/hero/perfumes/9am-dive.webp", vistas: secuencia("9am-dive"), nombre: "9 AM Dive", nota: "Afnan · Eau de parfum 100 ml", detalle: "Una presencia fresca para acompañarte cada día.", href: "/perfumes" },
  { imagen: "/hero/perfumes/9pm-elixir.webp", vistas: secuencia("9pm-elixir"), nombre: "9 PM Elixir", nota: "Afnan · Eau de parfum 100 ml", detalle: "Una expresión intensa para después del anochecer.", href: "/perfumes" },
  { imagen: "/hero/perfumes/odyssey-homme-black.webp", vistas: secuencia("odyssey-homme-black"), nombre: "Odyssey Homme Black", nota: "Armaf · Eau de parfum 100 ml", detalle: "Un frasco de carácter oscuro y elegante.", href: "/perfumes" },
  { imagen: "/hero/perfumes/odyssey-mandarin-sky-elixir.webp", vistas: secuencia("odyssey-mandarin-sky-elixir"), nombre: "Odyssey Mandarin Sky Elixir", nota: "Armaf · Eau de parfum 100 ml", detalle: "Color, energía y una silueta que atrae miradas.", href: "/perfumes" },
  { imagen: "/hero/perfumes/asad-edp-body-spray.webp", vistas: secuencia("asad-edp-body-spray"), nombre: "Set Asad", nota: "Lattafa · EDP + perfumed spray", detalle: "Un set de eau de parfum 3.4 oz y body spray 6.3 oz.", href: "/perfumes" },
  { imagen: "/hero/perfumes/asad-bourbon-elixir.webp", vistas: secuencia("asad-bourbon-elixir"), nombre: "Set Asad Bourbon + Elixir", nota: "Lattafa · Dos eau de parfum 100 ml", detalle: "Dos eau de parfum de 3.4 oz en una sola selección.", href: "/perfumes" },
];
