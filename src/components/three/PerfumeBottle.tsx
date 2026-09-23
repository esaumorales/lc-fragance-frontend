"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
type Props = { autoRotate?: boolean; liquidColor?: string; lightweight?: boolean; centered?: boolean };
export function PerfumeBottle({ autoRotate = true, liquidColor = "#b8860b", lightweight = false, centered = false }: Props) {
  const group = useRef<THREE.Group>(null);
  const label = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0b0b0b"; ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 5; ctx.strokeRect(20, 20, 472, 472);
      ctx.fillStyle = "#d4af37"; ctx.textAlign = "center"; ctx.font = "140px Georgia"; ctx.fillText("LC", 256, 215);
      ctx.font = "42px Georgia"; ctx.fillText("FRAGANCE", 256, 300);
      ctx.fillRect(180, 340, 152, 2); ctx.fillStyle = "#f5f1e7"; ctx.font = "23px sans-serif"; ctx.fillText("EAU DE PARFUM", 256, 400);
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
  }, []);
  useEffect(() => () => label.dispose(), [label]);
  useFrame((_, delta) => { if (autoRotate && group.current) group.current.rotation.y += delta * 0.2; });
  return <group ref={group} position={[0, centered ? -0.3 : -0.12, 0]} rotation={[0, -0.28, 0]}>
    <RoundedBox args={[1.02, 1.3, 0.55]} radius={0.09} smoothness={4} castShadow receiveShadow>
      <meshPhysicalMaterial color="#f5f1e7" transmission={lightweight ? 0 : 0.94} transparent={lightweight} opacity={lightweight ? 0.32 : 1} roughness={0.08} thickness={0.28} ior={1.5} clearcoat={1} />
    </RoundedBox>
    <RoundedBox args={[0.87, 1.08, 0.41]} position={[0, -0.04, 0]} radius={0.06} smoothness={3}>
      <meshStandardMaterial color={liquidColor} metalness={0.15} roughness={0.25} />
    </RoundedBox>
    <RoundedBox args={[1.03, 0.08, 0.56]} position={[0, -0.64, 0]} radius={0.025} smoothness={3}><meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} /></RoundedBox>
    <mesh position={[0, 0.71, 0]}><cylinderGeometry args={[0.16, 0.18, 0.18, 32]} /><meshStandardMaterial color="#d4af37" metalness={0.92} roughness={0.16} /></mesh>
    <RoundedBox args={[0.43, 0.38, 0.38]} position={[0, 0.94, 0]} radius={0.045} smoothness={3} castShadow><meshStandardMaterial color="#161411" metalness={0.55} roughness={0.22} /></RoundedBox>
    <RoundedBox args={[0.44, 0.045, 0.39]} position={[0, 0.79, 0]} radius={0.015} smoothness={2}><meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.16} /></RoundedBox>
    <mesh position={[0, 0.04, 0.282]}><planeGeometry args={[0.64, 0.64]} /><meshStandardMaterial map={label} roughness={0.48} metalness={0.2} /></mesh>
  </group>;
}
