"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls, Environment, Lightformer } from "@react-three/drei";
import { PerfumeBottle } from "@/components/three/PerfumeBottle";

type BottleCanvasProps = {
  interactive?: boolean;
  autoRotate?: boolean;
  liquidColor?: string;
  className?: string;
  /** Avisa cuando el lienzo ya esta vivo, para tapar el montaje de WebGL. */
  onReady?: () => void;
  /** Vidrio sin transmision: la transmision re-renderiza la escena entera en
   *  cada cuadro y es lo que hace que arrastrar se sienta pesado. */
  lightweight?: boolean;
};

export default function BottleCanvas({
  interactive = false,
  autoRotate = true,
  liquidColor,
  className,
  onReady,
  lightweight = false,
}: BottleCanvasProps) {
  return (
    <div className={className}>
      <Canvas
        shadows={!lightweight}
        dpr={[1, lightweight ? 1.25 : 1.5]}
        frameloop={autoRotate ? "always" : "demand"}
        camera={{ position: [0, 0.15, 5.2], fov: 30 }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        onCreated={() => onReady?.()}
      >
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[3, 4, 2]}
          intensity={3}
          color="#fff6e0"
          castShadow={!lightweight}
          shadow-mapSize={[512, 512]}
        />
        <pointLight position={[-3, 1.5, 1]} intensity={8} color="#e8c874" />
        <pointLight position={[2, -1, 3]} intensity={3} color="#f2e9d8" />

        <Suspense fallback={null}>
          <PerfumeBottle autoRotate={autoRotate} liquidColor={liquidColor} lightweight={lightweight} />
          <Environment resolution={128} frames={1}>
            <color attach="background" args={["#2e2a24"]} />
            <Lightformer intensity={4} color="#f5f1e7" position={[3, 3, 2]} rotation={[0, -Math.PI / 4, 0]} scale={[3, 6, 1]} />
            <Lightformer intensity={3} color="#d4af37" position={[-3, 1, 2]} rotation={[0, Math.PI / 4, 0]} scale={[2, 5, 1]} />
            <Lightformer intensity={2} color="#faf9f6" position={[0, 3, -3]} scale={[5, 2, 1]} />
          </Environment>
          <ContactShadows
            position={[0, -0.85, 0]}
            opacity={0.5}
            scale={4}
            blur={2.5}
            far={2}
            resolution={128}
            frames={autoRotate ? Infinity : 1}
          />
        </Suspense>

        {interactive ? (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={Math.PI / 2.6}
            maxPolarAngle={Math.PI / 1.8}
          />
        ) : null}
      </Canvas>
    </div>
  );
}

