"""
Rasterizador por software con z-buffer, en numpy.

Existe para hornear fotogramas fuera de linea: sin el presupuesto de un cuadro
a 60fps se puede gastar mucho mas en el sombreado (supermuestreo, luz de
contorno, varias pasadas) y el resultado supera a lo que aguanta WebGL en vivo.

Lo que vive aca es lo que no depende del objeto: proyeccion, cobertura,
profundidad e interpolacion de atributos. El sombreado lo pone cada escena,
porque la piel y el vidrio no se iluminan igual.

Requiere: pip install numpy pillow
"""

import math

import numpy as np


# --------------------------------------------------------------------------
# Vectores
# --------------------------------------------------------------------------

def normalizar(v):
    return v / np.linalg.norm(v)


def normalizar_filas(v):
    return v / np.maximum(np.linalg.norm(v, axis=1, keepdims=True), 1e-9)


def rotacion_y(angulo):
    c, s = math.cos(angulo), math.sin(angulo)
    return np.array([[c, 0.0, s], [0.0, 1.0, 0.0], [-s, 0.0, c]])


def rotacion_x(angulo):
    c, s = math.cos(angulo), math.sin(angulo)
    return np.array([[1.0, 0.0, 0.0], [0.0, c, -s], [0.0, s, c]])


class Camara:
    """Camara en perspectiva que mira a un punto."""

    def __init__(self, posicion, objetivo, fov_y):
        self.posicion = np.asarray(posicion, dtype=np.float64)
        self.objetivo = np.asarray(objetivo, dtype=np.float64)
        self.fov_y = fov_y

    def matriz(self):
        adelante = normalizar(self.objetivo - self.posicion)
        derecha = normalizar(np.cross(adelante, np.array([0.0, 1.0, 0.0])))
        arriba = np.cross(derecha, adelante)
        return np.column_stack([derecha, arriba, -adelante]).T


class Fragmentos:
    """Lo que quedo visible tras rasterizar, ya aplanado a lista de pixeles."""

    def __init__(self, cubierto, normal, dir_vista, atributos, profundidad):
        self.cubierto = cubierto          # (alto, ancho) bool
        self.normal = normal              # (n, 3) normalizada, en espacio de camara
        self.dir_vista = dir_vista        # (n, 3) del pixel hacia la camara
        self.atributos = atributos        # (n, k) interpolados
        self.profundidad = profundidad    # (alto, ancho) float, inf donde no hay nada


def rasterizar(vertices, normales, atributos, caras, camara, ancho, alto):
    """
    Proyecta la malla y resuelve visibilidad por z-buffer.

    `atributos` son valores por vertice que se interpolan con las baricentricas:
    UV, indice de material, lo que la escena necesite. Un valor constante en los
    tres vertices sobrevive intacto, asi que sirve para datos por cara.
    """
    vista = camara.matriz()
    cam = (vertices - camara.posicion) @ vista.T
    cam_n = normales @ vista.T
    profundidad_v = -cam[:, 2]

    focal = 1.0 / math.tan(camara.fov_y / 2)
    aspecto = ancho / alto
    segura = np.maximum(profundidad_v, 1e-6)
    sx = (cam[:, 0] * focal / aspecto / segura * 0.5 + 0.5) * (ancho - 1)
    sy = (1.0 - (cam[:, 1] * focal / segura * 0.5 + 0.5)) * (alto - 1)

    k = atributos.shape[1]
    zbuf = np.full((alto, ancho), np.inf)
    g_normal = np.zeros((alto, ancho, 3))
    g_atrib = np.zeros((alto, ancho, k))
    g_pos = np.zeros((alto, ancho, 3))
    cubierto = np.zeros((alto, ancho), bool)

    for tri in caras:
        ax, ay = sx[tri[0]], sy[tri[0]]
        bx, by = sx[tri[1]], sy[tri[1]]
        cx, cy = sx[tri[2]], sy[tri[2]]

        # Descarte de caras traseras en espacio de pantalla.
        area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)
        if area >= -1e-9:
            continue

        x0 = max(int(math.floor(min(ax, bx, cx))), 0)
        x1 = min(int(math.ceil(max(ax, bx, cx))), ancho - 1)
        y0 = max(int(math.floor(min(ay, by, cy))), 0)
        y1 = min(int(math.ceil(max(ay, by, cy))), alto - 1)
        if x1 < x0 or y1 < y0:
            continue

        xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        px = xs.ravel().astype(np.float64)
        py = ys.ravel().astype(np.float64)

        w0 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / area
        w1 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / area
        w2 = 1.0 - w0 - w1
        dentro = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
        if not dentro.any():
            continue

        w0, w1, w2 = w0[dentro], w1[dentro], w2[dentro]
        yy = ys.ravel()[dentro]
        xx = xs.ravel()[dentro]

        z = w0 * profundidad_v[tri[0]] + w1 * profundidad_v[tri[1]] + w2 * profundidad_v[tri[2]]
        mas_cerca = z < zbuf[yy, xx]
        if not mas_cerca.any():
            continue

        yy, xx, z = yy[mas_cerca], xx[mas_cerca], z[mas_cerca]
        bari = np.stack([w0[mas_cerca], w1[mas_cerca], w2[mas_cerca]], axis=1)

        zbuf[yy, xx] = z
        g_normal[yy, xx] = bari @ cam_n[tri]
        g_atrib[yy, xx] = bari @ atributos[tri]
        g_pos[yy, xx] = bari @ cam[tri]
        cubierto[yy, xx] = True

    normal = normalizar_filas(g_normal[cubierto])
    dir_vista = normalizar_filas(-g_pos[cubierto])
    return Fragmentos(cubierto, normal, dir_vista, g_atrib[cubierto], zbuf)


# --------------------------------------------------------------------------
# Salida
# --------------------------------------------------------------------------

def tonemapear(color):
    """Filmico corto: evita que la luz de contorno se queme a blanco plano."""
    color = np.clip(color, 0.0, None)
    mapeado = (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14)
    return np.clip(mapeado, 0.0, 1.0) ** (1.0 / 2.2)


def reducir(imagen, factor):
    """Promedia bloques de factor x factor: es el antialias del supermuestreo."""
    if factor == 1:
        return imagen
    alto, ancho, canales = imagen.shape
    return imagen.reshape(alto // factor, factor, ancho // factor, factor, canales).mean(axis=(1, 3))


def caja_comun(fotogramas, margen=12, umbral=8):
    """
    Recorte unico para toda la tanda.

    Tiene que ser la union de las cajas de alfa y no la de cada fotograma: con
    un recorte por fotograma el objeto salta de posicion al pasar de uno a otro.
    """
    union = np.zeros(fotogramas[0].shape[:2], bool)
    for fotograma in fotogramas:
        union |= fotograma[:, :, 3] > umbral

    filas = np.where(union.any(axis=1))[0]
    columnas = np.where(union.any(axis=0))[0]
    arriba = max(int(filas[0]) - margen, 0)
    abajo = min(int(filas[-1]) + margen + 1, union.shape[0])
    izquierda = max(int(columnas[0]) - margen, 0)
    derecha = min(int(columnas[-1]) + margen + 1, union.shape[1])
    return arriba, abajo, izquierda, derecha
