"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";

import type { Product } from "@/lib/types";
const BottleCanvas = dynamic(() => import("@/components/three/BottleCanvas"), { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-primary" role="status">Preparando vista 3D…</div> });
export function ProductVisual({ product }: { product: Product }) {
  const [selected, setSelected] = useState(0);
  const [show3d, setShow3d] = useState(false);
  const perfume = "notasOlfativas" in product.attributes || "mlVolume" in product.attributes || /perfume|parfum|toilette|fragancia/i.test(product.name + " " + product.description);
  return <div className="flex min-w-0 flex-col gap-4">
    <div className="product-stage relative aspect-square overflow-hidden rounded-2xl border border-hairline">
      {show3d ? <BottleCanvas className="h-full w-full" interactive autoRotate={false} /> : product.images[selected] ? <Image src={product.images[selected]} alt={product.name} fill sizes="(min-width: 768px) 50vw, 100vw" priority className="object-contain p-8 transition-all" /> : <div className="product-placeholder"><span aria-hidden="true">LC</span><span>Fotografía próximamente</span></div>}
      <span className="absolute left-6 top-6 text-[9px] uppercase tracking-[0.16em] text-primary">{show3d ? "Vista ilustrativa · arrastra para girar" : "LC · Selección exclusiva"}</span>
    </div>
    <div className="flex flex-wrap gap-3">{product.images.map((image, index) => <button key={`${image}-${index}`} type="button" aria-label={`Ver foto ${index + 1}`} aria-pressed={!show3d && selected === index} onClick={() => { setSelected(index); setShow3d(false); }} className={`relative h-20 w-20 overflow-hidden rounded-lg border bg-surface ${!show3d && selected === index ? "border-primary" : "border-border"}`}><Image src={image} alt="" fill sizes="80px" className="object-contain p-2" /></button>)}{perfume && <button type="button" aria-pressed={show3d} onClick={() => setShow3d(!show3d)} className="rounded border border-hairline px-5 py-3 text-[10px] uppercase tracking-widest text-primary">{show3d ? "Volver a fotos" : "Explorar 3D"}</button>}</div>
    {show3d && <p className="text-xs text-muted-foreground">Modelo decorativo de la colección. Consulta las fotos para ver el producto real.</p>}
  </div>;
}

