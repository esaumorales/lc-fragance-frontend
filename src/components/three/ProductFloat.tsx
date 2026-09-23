"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { Phone } from "@/components/three/Phone";
import { PerfumeBottle } from "@/components/three/PerfumeBottle";

export type ShowcaseItem = "perfume" | "phone";

// Producto flotando en su propio lienzo. Sin uso desde que el hero pasó al
// emblema + BottleCanvas; se conserva por el modelo del celular.
function FloatingProduct({ item }: { item: ShowcaseItem }) {
  const group = useRef<THREE.Group>(null);
  const rendered = useRef<ShowcaseItem>(item);
  const scale = useRef(1);
  const [visible, setVisible] = useState<ShowcaseItem>(item);

  useFrame((state, delta) => {
    if (!group.current) return;

    const swapping = rendered.current !== item;
    scale.current = THREE.MathUtils.damp(scale.current, swapping ? 0 : 1, 9, delta);

    // Cuando termino de encogerse, recien ahi cambia el producto visible.
    if (swapping && scale.current < 0.06) {
      rendered.current = item;
      setVisible(item);
    }

    const t = state.clock.elapsedTime;
    group.current.scale.setScalar(Math.max(scale.current, 0.001));
    group.current.position.y = 0.44 + Math.sin(t * 1.1) * 0.04;
    group.current.rotation.z = Math.sin(t * 0.8) * 0.045;

    // Los dos son planos: de canto se leen como una linea. Por eso oscilan en
    // vez de dar la vuelta completa. El frasco barre un poco mas.
    if (visible === "phone") {
      group.current.rotation.x = -0.12;
      group.current.rotation.y = Math.sin(t * 0.5) * 0.62;
    } else {
      group.current.rotation.x = 0;
      group.current.rotation.y = Math.sin(t * 0.42) * 0.85;
    }
  });

  return (
    <group ref={group} position={[0, 0.44, 0]}>
      {visible === "perfume" ? (
        <group scale={0.65}>
          <PerfumeBottle autoRotate={false} lightweight centered />
        </group>
      ) : (
        <group scale={0.82}>
          <Phone />
        </group>
      )}
    </group>
  );
}

export default function ProductFloat({
  item,
  className,
  interactive = true,
}: {
  item: ShowcaseItem;
  className?: string;
  /** Cuando el lienzo es solo decorativo y hay algo debajo que sí recibe
   *  gestos. react-three-fiber escribe pointer-events:auto como estilo en
   *  linea en su contenedor, y eso le gana a cualquier clase del padre: la
   *  unica forma de apagarlo es por su prop `style`. */
  interactive?: boolean;
}) {
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.15, 4.2], fov: 30 }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        style={interactive ? undefined : { pointerEvents: "none" }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 4, 2]} intensity={2.4} color="#fff6e0" />
        <pointLight position={[0, -0.4, 3.4]} intensity={3} color="#ffe9c4" />
        <pointLight position={[-3, 1.2, -2]} intensity={5} color="#ffc98f" />

        {/* Iluminacion por imagen armada en la propia escena con paneles de
            luz (sin descargar ningun HDRI): es lo unico que hace que el metal
            dorado y el vidrio tengan algo que reflejar. */}
        <Environment resolution={128} frames={1}>
          <color attach="background" args={["#1a2230"]} />
          <Lightformer
            intensity={3.4}
            color="#fff2da"
            position={[3, 3, 2]}
            rotation={[0, -Math.PI / 4, 0]}
            scale={[7, 7, 1]}
          />
          <Lightformer
            intensity={2.4}
            color="#e6bd7e"
            position={[-4, 1.5, 1]}
            rotation={[0, Math.PI / 3, 0]}
            scale={[6, 6, 1]}
          />
          <Lightformer
            intensity={3.4}
            color="#ffb083"
            position={[-2, 2, -4]}
            rotation={[0, Math.PI, 0]}
            scale={[5, 5, 1]}
          />
          <Lightformer
            intensity={0.5}
            color="#4d6f9e"
            position={[0, -3.5, 1]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[7, 7, 1]}
          />
        </Environment>

        <FloatingProduct item={item} />
        <Sparkles count={10} scale={2.2} size={2} speed={0.3} color="#c9a961" opacity={0.4} />
      </Canvas>
    </div>
  );
}
