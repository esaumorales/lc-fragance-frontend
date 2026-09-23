"use client";

import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

const WIDTH = 0.68;
const HEIGHT = 1.45;
const CORNER = 0.115;

/**
 * Rectangulo de esquinas redondeadas. Extruido con un bisel minimo da los
 * cantos planos del telefono; una RoundedBox redondea tambien las caras
 * laterales y el perfil queda como una pastilla, no como un iPhone.
 */
function roundedRect(width: number, height: number, radius: number) {
  const x = width / 2;
  const y = height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-x + radius, -y);
  shape.lineTo(x - radius, -y);
  shape.absarc(x - radius, -y + radius, radius, -Math.PI / 2, 0, false);
  shape.lineTo(x, y - radius);
  shape.absarc(x - radius, y - radius, radius, 0, Math.PI / 2, false);
  shape.lineTo(-x + radius, y);
  shape.absarc(-x + radius, y - radius, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(-x, -y + radius);
  shape.absarc(-x + radius, -y + radius, radius, Math.PI, 1.5 * Math.PI, false);
  return shape;
}

function extruded(width: number, height: number, radius: number, depth: number, bevel: number) {
  const geometry = new THREE.ExtrudeGeometry(roundedRect(width, height, radius), {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: 0,
    bevelSegments: 2,
    curveSegments: 14,
  });
  geometry.translate(0, 0, -(depth + (bevel > 0 ? bevel : 0)) / 2);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Telefono con la silueta de un iPhone: cantos rectos, biseles finos y
 * parejos, esquinas muy redondeadas, la pastilla de la isla dinamica arriba
 * de la pantalla y el modulo cuadrado de tres camaras atras.
 *
 * No lleva ninguna marca ni logo: es una ilustracion del formato, no una
 * reproduccion de un producto de nadie.
 */
export function Phone({ accentColor = "#c9a961" }: { accentColor?: string }) {
  const rail = useMemo(() => extruded(WIDTH, HEIGHT, CORNER, 0.072, 0.012), []);
  const back = useMemo(() => extruded(WIDTH - 0.028, HEIGHT - 0.028, CORNER - 0.014, 0.052, 0), []);
  const bezel = useMemo(() => extruded(WIDTH - 0.026, HEIGHT - 0.026, CORNER - 0.013, 0.016, 0), []);
  const screen = useMemo(() => extruded(WIDTH - 0.062, HEIGHT - 0.062, CORNER - 0.031, 0.008, 0), []);

  return (
    <group>
      {/* Riel metalico perimetral */}
      <mesh geometry={rail} castShadow>
        <meshStandardMaterial color={accentColor} roughness={0.24} metalness={0.95} />
      </mesh>

      {/* Vidrio trasero, apenas hundido respecto al riel */}
      <mesh geometry={back} position={[0, 0, -0.012]}>
        <meshStandardMaterial color="#12161d" roughness={0.22} metalness={0.6} />
      </mesh>

      {/* Bisel negro del frente */}
      <mesh geometry={bezel} position={[0, 0, 0.03]}>
        <meshStandardMaterial color="#05070a" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Pantalla */}
      <mesh geometry={screen} position={[0, 0, 0.042]}>
        <meshStandardMaterial
          color="#101f31"
          roughness={0.06}
          metalness={0.3}
          emissive="#1d4066"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Isla dinamica: la pastilla negra es la señal mas reconocible de frente */}
      <RoundedBox
        args={[0.2, 0.056, 0.008]}
        radius={0.027}
        smoothness={4}
        position={[0, 0.578, 0.047]}
      >
        <meshStandardMaterial color="#020305" roughness={0.15} metalness={0.4} />
      </RoundedBox>

      {/* Reflejo diagonal sobre el vidrio */}
      <mesh position={[-0.13, 0.2, 0.048]} rotation={[0, 0, -0.44]}>
        <planeGeometry args={[0.16, 1.05]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.06} />
      </mesh>

      {/* Barra de gestos */}
      <mesh position={[0, -0.63, 0.048]}>
        <boxGeometry args={[0.22, 0.012, 0.004]} />
        <meshStandardMaterial color="#9fb4c8" roughness={0.4} transparent opacity={0.5} />
      </mesh>

      {/* Modulo de camaras: meseta cuadrada arriba a la izquierda del dorso */}
      <RoundedBox
        args={[0.31, 0.31, 0.026]}
        radius={0.075}
        smoothness={4}
        position={[-0.15, 0.47, -0.05]}
      >
        <meshStandardMaterial color={accentColor} roughness={0.28} metalness={0.9} />
      </RoundedBox>
      {[
        [-0.222, 0.542],
        [-0.078, 0.542],
        [-0.222, 0.398],
      ].map(([x, y], index) => (
        <group key={index} position={[x, y, -0.066]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.052, 0.052, 0.018, 16]} />
            <meshStandardMaterial color="#1b1f26" roughness={0.3} metalness={0.85} />
          </mesh>
          <mesh position={[0, 0, -0.009]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.034, 0.034, 0.012, 16]} />
            <meshStandardMaterial color="#04060a" roughness={0.04} metalness={0.5} />
          </mesh>
        </group>
      ))}
      {/* Flash y sensor LiDAR */}
      <mesh position={[-0.078, 0.398, -0.062]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.024, 0.024, 0.012, 12]} />
        <meshStandardMaterial color="#f6e6c0" emissive="#f0d79a" emissiveIntensity={0.4} />
      </mesh>

      {/* Botones: planos y al ras del riel, no capsulas */}
      <mesh position={[WIDTH / 2 + 0.004, 0.2, 0]}>
        <boxGeometry args={[0.012, 0.16, 0.042]} />
        <meshStandardMaterial color={accentColor} roughness={0.24} metalness={0.95} />
      </mesh>
      <mesh position={[-WIDTH / 2 - 0.004, 0.33, 0]}>
        <boxGeometry args={[0.012, 0.105, 0.042]} />
        <meshStandardMaterial color={accentColor} roughness={0.24} metalness={0.95} />
      </mesh>
      <mesh position={[-WIDTH / 2 - 0.004, 0.2, 0]}>
        <boxGeometry args={[0.012, 0.105, 0.042]} />
        <meshStandardMaterial color={accentColor} roughness={0.24} metalness={0.95} />
      </mesh>
      <mesh position={[-WIDTH / 2 - 0.004, 0.46, 0]}>
        <boxGeometry args={[0.012, 0.062, 0.042]} />
        <meshStandardMaterial color={accentColor} roughness={0.24} metalness={0.95} />
      </mesh>
    </group>
  );
}
