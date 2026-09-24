"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as MapaLeaflet, Marker } from "leaflet";
import { Icon } from "@/components/atoms/Icon";

// Plaza de Armas de Lima: solo para abrir el mapa en algun lado cuando todavia
// no hay punto elegido.
const CENTRO_POR_DEFECTO: [number, number] = [-12.0464, -77.0428];

type Props = {
  latitude: number | null;
  longitude: number | null;
  onCambio: (punto: { latitude: number; longitude: number } | null) => void;
};

/**
 * Mapa para marcar el punto exacto de la direccion.
 *
 * Usa Leaflet con mapas de OpenStreetMap: no pide clave, ni cuenta, ni tarjeta.
 * Leaflet toca el DOM directamente, asi que se carga al montar y no en el
 * servidor, donde no hay window.
 */
export function MapaDireccion({ latitude, longitude, onCambio }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLeaflet | null>(null);
  const marcador = useRef<Marker | null>(null);
  const alCambiar = useRef(onCambio);
  const [listo, setListo] = useState(false);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // La referencia evita volver a crear el mapa cada vez que cambia la funcion.
  // Se escribe en un efecto: durante el render no se tocan las referencias.
  useEffect(() => {
    alCambiar.current = onCambio;
  }, [onCambio]);

  useEffect(() => {
    let cancelado = false;

    async function crear() {
      const L = (await import("leaflet")).default;
      if (cancelado || !contenedor.current || mapa.current) return;

      const centro: [number, number] =
        latitude !== null && longitude !== null ? [latitude, longitude] : CENTRO_POR_DEFECTO;

      const instancia = L.map(contenedor.current).setView(centro, latitude !== null ? 17 : 12);

      // La atribucion es obligatoria al usar los mapas de OpenStreetMap.
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(instancia);

      // Un icono dibujado en HTML: el de Leaflet son imagenes que el empaquetador
      // no resuelve solo y terminan como marcadores rotos.
      const icono = L.divIcon({
        className: "",
        html: '<span class="pin-mapa"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      function poner(lat: number, lng: number) {
        if (marcador.current) {
          marcador.current.setLatLng([lat, lng]);
        } else {
          marcador.current = L.marker([lat, lng], { icon: icono, draggable: true }).addTo(instancia);
          marcador.current.on("dragend", () => {
            const p = marcador.current!.getLatLng();
            alCambiar.current({ latitude: p.lat, longitude: p.lng });
          });
        }
        alCambiar.current({ latitude: lat, longitude: lng });
      }

      instancia.on("click", (evento) => poner(evento.latlng.lat, evento.latlng.lng));

      if (latitude !== null && longitude !== null) {
        marcador.current = L.marker([latitude, longitude], { icon: icono, draggable: true }).addTo(
          instancia
        );
        marcador.current.on("dragend", () => {
          const p = marcador.current!.getLatLng();
          alCambiar.current({ latitude: p.lat, longitude: p.lng });
        });
      }

      mapa.current = instancia;
      setListo(true);
    }

    crear();

    return () => {
      cancelado = true;
      // Se guardan en locales: leer la referencia en la limpieza puede dar el
      // valor de otro render.
      const instancia = mapa.current;
      mapa.current = null;
      marcador.current = null;
      instancia?.remove();
    };
    // Se crea una sola vez: mover el punto despues no tiene que rehacer el mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      setError("Tu navegador no permite ubicarte");
      return;
    }
    setBuscandoUbicacion(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const { latitude: lat, longitude: lng } = posicion.coords;
        mapa.current?.setView([lat, lng], 17);
        marcador.current?.setLatLng([lat, lng]);
        alCambiar.current({ latitude: lat, longitude: lng });
        setBuscandoUbicacion(false);
      },
      () => {
        setError("No pudimos ubicarte. Marcá el punto en el mapa.");
        setBuscandoUbicacion(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function quitar() {
    marcador.current?.remove();
    marcador.current = null;
    alCambiar.current(null);
  }

  const hayPunto = latitude !== null && longitude !== null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Opcional: tocá el mapa para marcar dónde es exactamente. Podés arrastrar el punto para
        ajustarlo.
      </p>

      <div
        ref={contenedor}
        className="mapa-direccion h-64 w-full overflow-hidden border border-border"
        role="application"
        aria-label="Mapa para marcar la dirección"
      />

      {!listo ? <p className="text-xs text-muted-foreground">Cargando el mapa…</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={usarMiUbicacion}
          disabled={buscandoUbicacion}
          className="flex items-center gap-2 border border-border px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
        >
          <Icon icon="mdi:crosshairs-gps" className="h-4 w-4" />
          {buscandoUbicacion ? "Ubicando…" : "Usar mi ubicación"}
        </button>

        {hayPunto ? (
          <>
            <span className="text-[11px] text-muted-foreground">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </span>
            <button
              type="button"
              onClick={quitar}
              className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-red-400"
            >
              Quitar punto
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
