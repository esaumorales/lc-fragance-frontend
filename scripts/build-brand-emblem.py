"""
Extrae el monograma (LC + leon coronado) del logo original y lo deja con fondo
transparente en public/brand/emblem.webp.

El archivo original trae el fondo negro horneado y ademas su propio wordmark,
asi que en el sitio habia que recortarlo con overflow:hidden y desplazamientos
negativos (bordes cortados), y en tema claro invertirlo entero. Con el emblema
suelto y transparente nada de eso hace falta.

Requiere:  pip install numpy pillow
Uso:       python scripts/build-brand-emblem.py
"""

import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, "..", "public", "brand", "lc-fragance.png")
DST = os.path.join(HERE, "..", "public", "brand", "emblem.webp")

# El monograma vive en la mitad de arriba; abajo esta el wordmark, que sobra.
ZONA_MONOGRAMA = 0.60
# Umbrales de luminancia para separar el oro del fondo.
LUMA_FONDO = 0.10
LUMA_MARCA = 0.34


def main():
    imagen = Image.open(os.path.abspath(SRC)).convert("RGB")
    rgb = np.asarray(imagen, dtype=np.float32) / 255.0
    alto, ancho, _ = rgb.shape

    luma = rgb[:, :, 0] * 0.299 + rgb[:, :, 1] * 0.587 + rgb[:, :, 2] * 0.114

    # Alfa por luminancia: el oro queda opaco y el fondo negro desaparece, con
    # transicion suave para no dejar el borde dentado.
    alpha = np.clip((luma - LUMA_FONDO) / (LUMA_MARCA - LUMA_FONDO), 0.0, 1.0)

    corte = int(alto * ZONA_MONOGRAMA)
    alpha[corte:, :] = 0.0

    solido = alpha > 0.35
    filas = np.where(solido.any(axis=1))[0]
    columnas = np.where(solido.any(axis=0))[0]
    margen = int(min(alto, ancho) * 0.02)
    arriba = max(int(filas[0]) - margen, 0)
    abajo = min(int(filas[-1]) + margen, alto)
    izq = max(int(columnas[0]) - margen, 0)
    der = min(int(columnas[-1]) + margen, ancho)
    print("recorte del monograma:", der - izq, "x", abajo - arriba)

    recorte_rgb = rgb[arriba:abajo, izq:der]
    recorte_a = alpha[arriba:abajo, izq:der]

    # Se desmultiplica: si no, los pixeles del borde arrastran el negro del
    # fondo y el emblema queda con un halo sucio sobre fondo claro.
    seguro = np.maximum(recorte_a, 1e-3)[..., None]
    color = np.clip(recorte_rgb / seguro, 0.0, 1.0)

    salida = np.concatenate([color, recorte_a[..., None]], axis=2)
    resultado = Image.fromarray((salida * 255).astype(np.uint8), mode="RGBA")

    # 512 de alto alcanza para el header y para el hero en pantallas grandes.
    escala = 512 / resultado.height
    resultado = resultado.resize(
        (max(int(resultado.width * escala), 1), 512), Image.LANCZOS
    )

    destino = os.path.abspath(DST)
    resultado.save(destino, format="WEBP", quality=92, method=6)
    print("escrito:", destino, os.path.getsize(destino) // 1024, "KB")


if __name__ == "__main__":
    main()
