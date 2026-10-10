"""
Hornea un frasco suelto por cada tono de la paleta, para la vitrina del heroe.

Son imagenes de relleno: el dueño reemplaza cada una por la foto real del
perfume cuando la tenga. Por eso salen recortadas, con fondo transparente y
todas con el mismo encuadre, que es justo lo que se le pide a una foto de
producto para que la fila no baile.

Salida:  public/hero/perfumes/<nombre>.webp

Requiere: pip install numpy pillow
Uso:      python scripts/render-perfumes.py
"""

import math
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import geometria_frasco as geo
import sombreado_frasco as luz
from rasterizador import caja_comun, rasterizar, reducir, rotacion_y

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.abspath(os.path.join(AQUI, "..", "public", "hero", "perfumes"))

ANCHO = int(os.environ.get("PERFUME_WIDTH", 460))
ALTO = int(os.environ.get("PERFUME_HEIGHT", 760))
SUPERMUESTREO = int(os.environ.get("PERFUME_SS", 2))
CALIDAD = int(os.environ.get("PERFUME_QUALITY", 78))

# Tres cuartos: de frente el frasco se lee como un rectangulo y se pierde el
# volumen; girado se le ve el canto y el vidrio del costado.
ANGULO = geo.GIRO_BASE - 0.22

# El tono del liquido es lo unico que cambia entre uno y otro.
PALETA = [
    ("ambar", "#b8860b"),
    ("noir", "#2b2420"),
    ("rosa", "#c2667a"),
    ("esmeralda", "#1f6f5c"),
    ("azul-noche", "#2a3f72"),
    ("coral", "#d2663c"),
    ("lavanda", "#7b6aa6"),
    ("oro-blanco", "#ddd4bb"),
    ("borgona", "#73222f"),
]


def render(malla, textura, color_hexa, ancho, alto):
    """Un frasco con ese liquido, sobre transparencia."""
    (iv, inor, iatr, icar), (vv, vnor, vatr, vcar) = malla
    giro = rotacion_y(ANGULO)

    interior = rasterizar(iv @ giro.T, inor @ giro.T, iatr, icar, luz.CAMARA, ancho, alto)
    vidrio = rasterizar(vv @ giro.T, vnor @ giro.T, vatr, vcar, luz.CAMARA, ancho, alto)
    return luz.componer(interior, vidrio, textura, ancho, alto, luz.a_lineal(color_hexa))


def main():
    ancho, alto = ANCHO * SUPERMUESTREO, ALTO * SUPERMUESTREO
    # La malla y la etiqueta no cambian entre frascos: se arman una sola vez.
    malla = geo.construir()
    textura = luz.etiqueta_textura()
    piezas = []

    for nombre, color in PALETA:
        pieza = reducir(render(malla, textura, color, ancho, alto), SUPERMUESTREO)
        piezas.append((nombre, (pieza * 255).astype(np.uint8)))
        print(f"  {nombre:<12} {color}")

    # Recorte unico: si cada frasco se recorta solo, en la fila quedan de
    # distinto tamaño aunque midan lo mismo en el mundo.
    arriba, abajo, izquierda, derecha = caja_comun([p for _, p in piezas], margen=8)
    print(f"recorte comun: {derecha - izquierda} x {abajo - arriba}")

    os.makedirs(SALIDA, exist_ok=True)
    peso = 0
    for nombre, pieza in piezas:
        ruta = os.path.join(SALIDA, f"{nombre}.webp")
        Image.fromarray(pieza[arriba:abajo, izquierda:derecha], mode="RGBA").save(
            ruta, format="WEBP", quality=CALIDAD, method=6
        )
        peso += os.path.getsize(ruta)

    print(f"total: {peso // 1024} KB en {len(piezas)} frascos")
    print(f"tamaño: {derecha - izquierda} x {abajo - arriba}")


if __name__ == "__main__":
    main()
