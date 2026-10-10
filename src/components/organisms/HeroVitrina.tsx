"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/atoms/Icon";
import { PERFUMES_VITRINA } from "@/data/perfumes-vitrina";
import type { PerfumeDeVitrina } from "@/data/perfumes-vitrina";
import { PerfumeSpotlightDialog } from "@/components/organisms/PerfumeSpotlightDialog";
import { PERSPECTIVA, avance, capa, colocar, fotogramaParaDistancia, piezaCentrada, progresoDeSeccion } from "@/lib/vitrina";

/** Cuanto scroll ocupa pasar de un frasco al siguiente, en pantallas. */
const PANTALLAS_POR_PIEZA = 0.9;

// Al abrir la pagina el scroll esta arriba de todo, asi que el centrado es
// siempre el primero de la lista.
const INICIAL = 0;

function distanciaEnRueda(indice: number, posicion: number, cantidad: number): number {
  return ((indice - posicion + cantidad * 1.5) % cantidad) - cantidad / 2;
}

function transformar(distancia: number) {
  const { x, z, giro } = colocar(distancia);
  const enfoque = Math.max(0, 1 - Math.abs(distancia));
  const escala = 1 + enfoque * 0.2;
  return `translate3d(${x}px, ${Math.abs(distancia) * 18 - enfoque * 45}px, ${z}px) rotateY(${giro}deg) scale(${escala})`;
}

function pesoDeVista(indice: number, distancia: number): number {
  return indice === fotogramaParaDistancia(distancia) ? 1 : 0;
}

export function HeroVitrina() {
  const seccion = useRef<HTMLElement>(null);
  const piezas = useRef<(HTMLElement | null)[]>([]);
  const pendiente = useRef(false);
  const [centrada, setCentrada] = useState(INICIAL);
  const [seleccionado, setSeleccionado] = useState<PerfumeDeVitrina | null>(null);

  const cantidad = PERFUMES_VITRINA.length;
  const alto = 100 + cantidad * PANTALLAS_POR_PIEZA * 100;

  // Colocar cada frasco a mano y no con una clase por estado: los valores son
  // continuos, no hay un numero finito de posiciones que nombrar.
  const acomodar = useCallback((posicion: number) => {
    piezas.current.forEach((pieza, indice) => {
      if (!pieza) return;
      // La fila cierra en círculo: incluso al inicio hay perfumes a ambos
      // lados del protagonista, como en una vitrina física.
      const distancia = distanciaEnRueda(indice, posicion, cantidad);
      const { opacidad, alcanzable } = colocar(distancia);
      const vistas = pieza.querySelectorAll<HTMLImageElement>(".vitrina-vista");

      pieza.style.transform = transformar(distancia);
      pieza.style.opacity = String(opacidad);
      pieza.style.zIndex = String(capa(distancia));
      vistas.forEach((vista, indiceVista) => {
        vista.style.opacity = String(pesoDeVista(indiceVista, distancia));
      });
      // Transparente pero no oculto: con visibility o display, los frascos de
      // los extremos se caen del arbol de accesibilidad y el lector de
      // pantalla deja de nombrar media coleccion.
      pieza.style.pointerEvents = alcanzable ? "auto" : "none";
      pieza.dataset.centrada = Math.abs(distancia) < 0.5 ? "true" : "false";
    });
  }, [cantidad]);

  // La cabecera del sitio es pegada y su alto cambia con el ancho: la vitrina
  // tiene que empezar debajo, o el titulo queda tapado al scrollear.
  const medirCabecera = useCallback(() => {
    const cabecera = document.querySelector("header");
    const alto = Math.round(cabecera?.getBoundingClientRect().height ?? 0);
    seccion.current?.style.setProperty("--alto-cabecera", `${alto}px`);
  }, []);

  const avanzar = useCallback(() => {
    pendiente.current = false;
    const caja = seccion.current?.getBoundingClientRect();
    if (!caja) return;

    const progreso = progresoDeSeccion(caja.top, caja.height, window.innerHeight);
    acomodar(avance(progreso, cantidad));
    setCentrada(piezaCentrada(progreso, cantidad));
  }, [acomodar, cantidad]);

  useEffect(() => {
    // Antes de que llegue el primer scroll la fila tiene que estar puesta.
    medirCabecera();
    acomodar(INICIAL);

    // Quien pidio menos movimiento se queda con el frasco destacado al
    // frente, sin que el scroll corra la fila.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const alScrollear = () => {
      if (pendiente.current) return;
      pendiente.current = true;
      requestAnimationFrame(avanzar);
    };

    const alRedimensionar = () => {
      medirCabecera();
      alScrollear();
    };

    avanzar();
    window.addEventListener("scroll", alScrollear, { passive: true });
    window.addEventListener("resize", alRedimensionar);
    return () => {
      window.removeEventListener("scroll", alScrollear);
      window.removeEventListener("resize", alRedimensionar);
    };
  }, [acomodar, avanzar, medirCabecera]);

  // Con el teclado se recorre la fila con el tabulador: el frasco enfocado
  // tiene que venir al frente, si no se navega a ciegas.
  const alEnfocar = useCallback(
    (indice: number) => {
      const caja = seccion.current?.getBoundingClientRect();
      if (!caja || cantidad <= 1) return;
      const recorrido = caja.height - window.innerHeight;
      const destino = caja.top + window.scrollY + (indice / (cantidad - 1)) * recorrido;
      window.scrollTo({ top: destino, behavior: "smooth" });
    },
    [cantidad]
  );

  const actual = PERFUMES_VITRINA[centrada] ?? PERFUMES_VITRINA[0]!;

  return (
    <>
      <section ref={seccion} className="vitrina" style={{ height: `${alto}vh` }}>
        <div className="vitrina-pegada">
          <header className="vitrina-encabezado">
            <p className="eyebrow vitrina-rotulo">
              <span /> EL ARTE DE DISTINGUIRTE
            </p>
            <h1 className="vitrina-titulo">
              Una esencia.
              <br />
              <em>Tu identidad.</em>
            </h1>
          </header>

          <div
            className="vitrina-pista"
            style={{ perspective: `${PERSPECTIVA}px` }}
            aria-label="Colección de perfumes"
          >
            <span className="vitrina-escena-rotulo" aria-hidden="true">SELECCIÓN / LC FRAGANCE</span>
            {PERFUMES_VITRINA.map((perfume, indice) => {
              const distancia = distanciaEnRueda(indice, INICIAL, cantidad);
              const { opacidad, alcanzable } = colocar(distancia);
              return (
              <article
                key={perfume.imagen}
                ref={(nodo) => {
                  piezas.current[indice] = nodo;
                }}
                className="vitrina-pieza"
                data-centrada={Math.abs(distancia) < 0.5 ? "true" : "false"}
                style={{
                  transform: transformar(distancia),
                  opacity: opacidad,
                  zIndex: capa(distancia),
                  pointerEvents: alcanzable ? "auto" : "none",
                }}
              >
                <button type="button" onClick={() => setSeleccionado(perfume)} onFocus={() => alEnfocar(indice)} aria-label={`Descubrir ${perfume.nombre}`}>
                  {perfume.vistas.map((ruta, indiceVista) => (
                    // Solo la fotografía frontal aporta texto alternativo; las
                    // otras diez son fotogramas decorativos de la misma pieza.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={ruta}
                      className="vitrina-vista"
                      src={ruta}
                      alt={indiceVista === 5 ? `${perfume.nombre}, ${perfume.nota}` : ""}
                      aria-hidden={indiceVista === 5 ? undefined : true}
                      style={{ opacity: pesoDeVista(indiceVista, distancia) }}
                      fetchPriority={indiceVista === 5 ? (indice === INICIAL ? "high" : "auto") : "low"}
                      decoding="async"
                      draggable={false}
                    />
                  ))}
                </button>
              </article>
              );
            })}
            <span className="vitrina-pedestal" aria-hidden="true" />
            <span className="vitrina-escena-numero" aria-hidden="true">0{cantidad} PIEZAS</span>
          </div>

          {/* La ficha del que esta al frente. Vive afuera del arco para que no
              se incline ni se achique con el. */}
          <footer className="vitrina-ficha" aria-live="polite">
            <h2 className="vitrina-nombre">{actual.nombre}</h2>
            <p className="vitrina-nota">{actual.nota}</p>
            <Link href={actual.href} className="editorial-cta vitrina-accion">
              Ver la colección
              <Icon icon="mdi:arrow-top-right" className="h-4 w-4" />
            </Link>
            <p className="vitrina-indicador" aria-hidden="true">
              <span>{String(centrada + 1).padStart(2, "0")}</span> / {String(cantidad).padStart(2, "0")}
              <i />
              Seguí bajando
            </p>
          </footer>
        </div>
      </section>

      {/* Estaba en el heroe anterior y es texto que conviene conservar:
          dice como se compra antes de que nadie tenga que preguntarlo. */}
      <div className="hero-service-strip">
        <span>
          <Icon icon="mdi:star-four-points-outline" /> Selección cuidada
        </span>
        <span>
          <Icon icon="mdi:whatsapp" /> Atención personal
        </span>
        <span>
          <Icon icon="mdi:wallet-outline" /> Pago por Yape
        </span>
        <span className="service-signature">
          LC FRAGANCE <i>—</i> TU ESENCIA, TU SELLO
        </span>
      </div>
      <PerfumeSpotlightDialog key={seleccionado?.imagen ?? "cerrado"} perfume={seleccionado} onClose={() => setSeleccionado(null)} />
    </>
  );
}
