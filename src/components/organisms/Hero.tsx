"use client";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Icon } from "@/components/atoms/Icon";
import { cn } from "@/lib/cn";
// Se extrae la importacion para poder dispararla antes del click.
const cargarVitrina = () => import("@/components/three/BottleCanvas");
const BottleCanvas = dynamic(cargarVitrina, {
  ssr: false,
  loading: () => null,
});

export function Hero() {
  const [explore, setExplore] = useState(false);
  const [vitrinaLista, setVitrinaLista] = useState(false);

  // El lienzo 3D pesa ~500 KB en chunks: se baja apenas el navegador esta
  // libre, asi el boton no hace esperar.
  useEffect(() => {
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    const id = idle ? idle(() => void cargarVitrina()) : window.setTimeout(() => void cargarVitrina(), 1800);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <section className="editorial-hero">
      <div className="hero-layout">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow"><span /> EL ARTE DE DISTINGUIRTE</p>
          <h1 className="hero-heading">Una esencia.<br /><em>Tu identidad.</em></h1>
          <p className="hero-description">Hay detalles que hablan por ti. Descubre perfumes y tecnología elegidos para dejar una impresión que perdura.</p>
          <div className="hero-actions">
            <Link href="/perfumes" className="editorial-cta">Descubrir perfumes <Icon icon="mdi:arrow-top-right" className="h-4 w-4" /></Link>
            <Link href="/tecnologia" className="editorial-link">Explorar tecnología <span>↗</span></Link>
          </div>
          <div className="hero-note"><span className="hero-star" aria-hidden="true">✦</span><p>Una selección cuidada.<br /><span>Un estilo que se siente tuyo.</span></p></div>
        </div>
        <div className="hero-visual">
          <div className="hero-art" data-view={explore ? "3d" : "brand"}>
            <div className="hero-orbit" aria-hidden="true" />
            {explore && <BottleCanvas className="hero-canvas" interactive autoRotate={false} lightweight onReady={() => setVitrinaLista(true)} />}
            <Image src="/brand/emblem.webp" alt="Emblema de LC Fragance: leon coronado sobre el monograma" fill priority sizes="(min-width: 1024px) 560px, 90vw" className={cn("hero-brand-image", explore && vitrinaLista && "hero-brand-image--oculto")} />
            {explore && <span className="art-interaction">Arrastra para girar · diseño ilustrativo</span>}
          </div>
          <div className="hero-art-footer"><div><span className="eyebrow">{explore ? "LA VITRINA" : "NUESTRA FIRMA"}</span><p>{explore ? "Diseñado para destacar" : "El carácter de LC Fragance"}</p></div><button type="button" className="art-toggle" onPointerEnter={() => void cargarVitrina()} onClick={() => setExplore(!explore)} aria-pressed={explore}><span>{explore ? "Ver la marca" : "Explorar 3D"}</span><Icon icon={explore ? "mdi:arrow-top-left" : "mdi:rotate-3d-variant"} className="h-5 w-5" /></button></div>
        </div>
      </div>
      <div className="hero-service-strip"><span><Icon icon="mdi:star-four-points-outline" /> Selección cuidada</span><span><Icon icon="mdi:whatsapp" /> Atención personal</span><span><Icon icon="mdi:wallet-outline" /> Pago por Yape</span><span className="service-signature">LC FRAGANCE <i>—</i> TU ESENCIA, TU SELLO</span></div>
    </section>
  );
}
