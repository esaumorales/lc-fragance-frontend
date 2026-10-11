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

export function HeroVitrina() {
  const seccion = useRef<HTMLElement>(null);
  const piezas = useRef<(HTMLElement | null)[]>([]);
  const precargas = useRef(new Map<string, HTMLImageElement>());
  const entradaDetalle = useRef(false);
  const pendiente = useRef(false);
  const [centrada, setCentrada] = useState(INICIAL);
  const [seleccionado, setSeleccionado] = useState<PerfumeDeVitrina | null>(null);

  const cantidad = PERFUMES_VITRINA.length;
  const alto = 100 + cantidad * PANTALLAS_POR_PIEZA * 100;

  const moverVista = useCallback(function mostrarAnguloActual(pieza: HTMLElement, indice: number) {
    const actual = Number(pieza.dataset.fotogramaActual);
    const deseado = Number(pieza.dataset.fotogramaDeseado);
    if (actual === deseado || pieza.dataset.fotogramaSolicitado) return;

    // Ir directo al ángulo del scroll: recorrer todos los intermedios deja
    // los frascos girando después de que la persona se detiene.
    const fotograma = deseado;
    const ruta = PERFUMES_VITRINA[indice]?.vistas[fotograma];
    const vistas = pieza.querySelectorAll<HTMLImageElement>(".vitrina-vista");
    const activa = Number(pieza.dataset.vistaActiva ?? "0");
    const anterior = vistas[activa];
    const siguiente = vistas[1 - activa];
    if (!ruta || !anterior || !siguiente) return;

    pieza.dataset.fotogramaSolicitado = String(fotograma);
    siguiente.src = ruta;
    void siguiente.decode().then(() => {
      if (!pieza.isConnected) return;
      pieza.dataset.fotogramaSolicitado = "";
      // Si cambió el scroll durante la descarga, saltar al destino nuevo.
      const nuevoDestino = Number(pieza.dataset.fotogramaDeseado);
      if (nuevoDestino !== fotograma) {
        mostrarAnguloActual(pieza, indice);
        return;
      }
      // El anterior sigue visible hasta que la nueva imagen está decodificada.
      siguiente.style.opacity = "1";
      siguiente.alt = anterior.alt;
      siguiente.removeAttribute("aria-hidden");
      anterior.alt = "";
      anterior.setAttribute("aria-hidden", "true");
      pieza.dataset.vistaActiva = String(1 - activa);
      pieza.dataset.fotogramaActual = String(fotograma);
      anterior.style.opacity = "0";
    }).catch(() => {
      if (pieza.dataset.fotogramaSolicitado === String(fotograma)) pieza.dataset.fotogramaSolicitado = "";
      if (pieza.dataset.fotogramaDeseado !== String(fotograma)) mostrarAnguloActual(pieza, indice);
    });
  }, []);

  // Colocar cada frasco a mano y no con una clase por estado: los valores son
  // continuos, no hay un numero finito de posiciones que nombrar.
  const acomodar = useCallback((posicion: number) => {
    piezas.current.forEach((pieza, indice) => {
      if (!pieza) return;
      // La fila cierra en círculo: incluso al inicio hay perfumes a ambos
      // lados del protagonista, como en una vitrina física.
      const distancia = distanciaEnRueda(indice, posicion, cantidad);
      const { opacidad, alcanzable } = colocar(distancia);
      pieza.style.transform = transformar(distancia);
      pieza.style.opacity = String(opacidad);
      pieza.style.zIndex = String(capa(distancia));
      const fotograma = fotogramaParaDistancia(distancia);
      pieza.dataset.fotogramaDeseado = String(fotograma);
      // Tener los vecinos inmediatos en caché evita esperar a la red justo
      // cuando el dedo cruza un ángulo. Se limita para no saturar el móvil.
      if (Math.abs(distancia) < 1.5) {
        for (const vecino of [fotograma - 1, fotograma + 1]) {
          const rutaVecina = PERFUMES_VITRINA[indice]?.vistas[vecino];
          if (!rutaVecina || precargas.current.has(rutaVecina)) continue;
          const imagen = new Image();
          imagen.decoding = "async";
          imagen.src = rutaVecina;
          precargas.current.set(rutaVecina, imagen);
          if (precargas.current.size > 12) precargas.current.delete(precargas.current.keys().next().value!);
          void imagen.decode().catch(() => precargas.current.delete(rutaVecina));
        }
      }
      moverVista(pieza, indice);
      // Transparente pero no oculto: con visibility o display, los frascos de
      // los extremos se caen del arbol de accesibilidad y el lector de
      // pantalla deja de nombrar media coleccion.
      pieza.style.pointerEvents = alcanzable ? "auto" : "none";
      pieza.dataset.centrada = Math.abs(distancia) < 0.5 ? "true" : "false";
    });
  }, [cantidad, moverVista]);

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
    const navegacion = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navegacion?.type !== "reload") return;
    history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, behavior: "auto" });
    return () => { history.scrollRestoration = "auto"; };
  }, []);

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

  useEffect(() => {
    if (!seleccionado) return;
    window.history.pushState({ vitrinaDetalle: true }, "", window.location.href);
    entradaDetalle.current = true;
    const volver = () => {
      entradaDetalle.current = false;
      setSeleccionado(null);
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    };
    window.addEventListener("popstate", volver);
    return () => window.removeEventListener("popstate", volver);
  }, [seleccionado]);

  const cerrarDetalle = useCallback(() => {
    if (entradaDetalle.current) {
      window.history.back();
      return;
    }
    setSeleccionado(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

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
                data-fotograma-actual={fotogramaParaDistancia(distancia)}
                data-vista-activa="0"
                data-centrada={Math.abs(distancia) < 0.5 ? "true" : "false"}
                style={{
                  transform: transformar(distancia),
                  opacity: opacidad,
                  zIndex: capa(distancia),
                  pointerEvents: alcanzable ? "auto" : "none",
                }}
              >
                <button type="button" onClick={() => setSeleccionado(perfume)} onFocus={() => alEnfocar(indice)} aria-label={`Descubrir ${perfume.nombre}`}>
                  {/* Dos capas alternan ángulos decodificados sin vaciar la vitrina. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="vitrina-vista" src={perfume.vistas[fotogramaParaDistancia(distancia)]} alt={`${perfume.nombre}, ${perfume.nota}`} style={{ opacity: 1 }} fetchPriority={indice === INICIAL ? "high" : "auto"} decoding="async" draggable={false} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="vitrina-vista" alt="" aria-hidden="true" style={{ opacity: 0 }} decoding="async" draggable={false} />
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
      <PerfumeSpotlightDialog key={seleccionado?.imagen ?? "cerrado"} perfume={seleccionado} onClose={cerrarDetalle} />
    </>
  );
}
