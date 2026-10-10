"""
Construye el frasco como malla de triangulos, con las mismas medidas que
components/three/PerfumeBottle.tsx: el contorno ya estaba aprobado y la
secuencia horneada no deberia cambiarlo.

Es geometria dura (cajas, cilindros, un plano), no una forma organica: aca lo
procedural da el resultado exacto, no una aproximacion.
"""

import math

import numpy as np

# Indices de material; el sombreado los lee del atributo interpolado.
VIDRIO = 0
LIQUIDO = 1
ORO = 2
TAPA = 3
ETIQUETA = 4


class Malla:
    """Posiciones, normales, atributos (u, v, material, altura) y caras."""

    def __init__(self):
        self.vertices = []
        self.normales = []
        self.atributos = []
        self.caras = []

    def agregar(self, vertices, normales, atributos, caras):
        base = sum(len(v) for v in self.vertices)
        self.vertices.append(np.asarray(vertices, dtype=np.float64))
        self.normales.append(np.asarray(normales, dtype=np.float64))
        self.atributos.append(np.asarray(atributos, dtype=np.float64))
        self.caras.append(np.asarray(caras, dtype=np.int64) + base)

    def terminar(self):
        return (
            np.concatenate(self.vertices),
            np.concatenate(self.normales),
            np.concatenate(self.atributos),
            np.concatenate(self.caras),
        )


def orientar(vertices, normales, caras):
    """
    Deja todas las caras en sentido antihorario vistas desde afuera.

    El rasterizador descarta las traseras por el signo del area, asi que una
    cara al reves no se dibuja. En vez de acertar el orden en cada primitiva,
    se corrige al final comparando con la normal.
    """
    a = vertices[caras[:, 0]]
    b = vertices[caras[:, 1]]
    c = vertices[caras[:, 2]]
    geometrica = np.cross(b - a, c - a)
    esperada = normales[caras].mean(axis=1)
    invertidas = np.einsum("ij,ij->i", geometrica, esperada) < 0
    caras[invertidas] = caras[invertidas][:, [0, 2, 1]]
    return caras


def _esfera_direcciones(filas, columnas):
    """Rejilla de direcciones unitarias y los triangulos que la cosen."""
    theta = np.linspace(0.0, math.pi, filas + 1)
    phi = np.linspace(0.0, 2.0 * math.pi, columnas + 1)[:-1]
    t, p = np.meshgrid(theta, phi, indexing="ij")
    direcciones = np.stack(
        [np.sin(t) * np.cos(p), np.cos(t), np.sin(t) * np.sin(p)], axis=-1
    ).reshape(-1, 3)

    caras = []
    for i in range(filas):
        for j in range(columnas):
            a = i * columnas + j
            b = i * columnas + (j + 1) % columnas
            c = (i + 1) * columnas + j
            d = (i + 1) * columnas + (j + 1) % columnas
            caras.append([a, c, d])
            caras.append([a, d, b])
    return direcciones, np.array(caras, dtype=np.int64)


def caja_redondeada(tamano, radio, material, centro=(0.0, 0.0, 0.0), filas=28, columnas=48):
    """
    Caja con aristas redondeadas, exacta.

    Una caja redondeada es la suma de Minkowski de una caja y una esfera, asi
    que el punto de la superficie con normal d es el apoyo de la caja en d mas
    radio por d. Partiendo de una esfera sale la malla entera con las normales
    ya correctas: no hay que suavizar nada despues.
    """
    mitad = np.asarray(tamano, dtype=np.float64) / 2.0 - radio
    direcciones, caras = _esfera_direcciones(filas, columnas)
    nucleo = np.sign(direcciones) * mitad
    posiciones = nucleo + radio * direcciones + np.asarray(centro, dtype=np.float64)
    atributos = np.zeros((len(posiciones), 4))
    atributos[:, 2] = material
    return posiciones, direcciones.copy(), atributos, caras


def cilindro(radio_arriba, radio_abajo, altura, material, centro=(0.0, 0.0, 0.0), lados=48):
    """Cilindro o tronco de cono con tapas, eje en Y."""
    cx, cy, cz = centro
    angulos = np.linspace(0.0, 2.0 * math.pi, lados, endpoint=False)
    cos, sen = np.cos(angulos), np.sin(angulos)

    arriba = np.stack([cx + radio_arriba * cos, np.full(lados, cy + altura / 2), cz + radio_arriba * sen], axis=1)
    abajo = np.stack([cx + radio_abajo * cos, np.full(lados, cy - altura / 2), cz + radio_abajo * sen], axis=1)

    # La normal del lateral se inclina con la conicidad.
    pendiente = (radio_abajo - radio_arriba) / altura
    lateral = np.stack([cos, np.full(lados, pendiente), sen], axis=1)
    lateral /= np.linalg.norm(lateral, axis=1, keepdims=True)

    posiciones = np.concatenate([arriba, abajo, [[cx, cy + altura / 2, cz]], [[cx, cy - altura / 2, cz]]])
    normales = np.concatenate([lateral, lateral, [[0.0, 1.0, 0.0]], [[0.0, -1.0, 0.0]]])

    caras = []
    for j in range(lados):
        k = (j + 1) % lados
        caras.append([j, lados + j, lados + k])
        caras.append([j, lados + k, k])
        caras.append([2 * lados, j, k])
        caras.append([2 * lados + 1, lados + j, lados + k])

    atributos = np.zeros((len(posiciones), 4))
    atributos[:, 2] = material
    return posiciones, normales, atributos, np.array(caras, dtype=np.int64)


def plano(ancho, alto, centro, material=ETIQUETA):
    """Cuadrilatero mirando a +Z, con UV para la etiqueta."""
    cx, cy, cz = centro
    a, b = ancho / 2, alto / 2
    posiciones = np.array([
        [cx - a, cy - b, cz], [cx + a, cy - b, cz],
        [cx + a, cy + b, cz], [cx - a, cy + b, cz],
    ])
    normales = np.tile([0.0, 0.0, 1.0], (4, 1))
    atributos = np.array([
        [0.0, 0.0, material, 0.0], [1.0, 0.0, material, 0.0],
        [1.0, 1.0, material, 0.0], [0.0, 1.0, material, 0.0],
    ])
    caras = np.array([[0, 1, 2], [0, 2, 3]], dtype=np.int64)
    return posiciones, normales, atributos, caras


# Medidas de PerfumeBottle.tsx. El grupo entero baja 0.12 y gira -0.28 rad.
DESPLAZAMIENTO = np.array([0.0, -0.12, 0.0])
GIRO_BASE = -0.28


def construir():
    """Devuelve (interior, vidrio): dos mallas, porque el vidrio va en su pasada."""
    interior = Malla()
    # Casi al ras del vidrio: un frasco medio vacio deja un marco oscuro
    # alrededor del liquido y parece una caja, no un perfume.
    interior.agregar(*caja_redondeada((0.95, 1.20, 0.48), 0.072, LIQUIDO, centro=(0.0, -0.045, 0.0)))
    interior.agregar(*caja_redondeada((1.03, 0.08, 0.56), 0.025, ORO, centro=(0.0, -0.64, 0.0), filas=14, columnas=40))
    interior.agregar(*cilindro(0.16, 0.18, 0.18, ORO, centro=(0.0, 0.71, 0.0)))
    interior.agregar(*caja_redondeada((0.44, 0.045, 0.39), 0.015, ORO, centro=(0.0, 0.79, 0.0), filas=12, columnas=36))
    interior.agregar(*caja_redondeada((0.43, 0.38, 0.38), 0.045, TAPA, centro=(0.0, 0.94, 0.0), filas=20, columnas=36))
    # Apoyada sobre la cara frontal del vidrio (z = 0.275), no flotando dentro:
    # a ras del plano los dos pelean por el z y la etiqueta parpadea.
    interior.agregar(*plano(0.64, 0.64, (0.0, 0.04, 0.2795)))

    vidrio = Malla()
    vidrio.agregar(*caja_redondeada((1.02, 1.30, 0.55), 0.09, VIDRIO, filas=36, columnas=64))

    def listo(malla):
        vertices, normales, atributos, caras = malla.terminar()
        vertices = vertices + DESPLAZAMIENTO
        # La altura viaja como atributo porque el giro es en Y y no la cambia:
        # con ella el sombreado hace el degradado del liquido sin mas datos.
        atributos[:, 3] = vertices[:, 1]
        return vertices, normales, atributos, orientar(vertices, normales, caras)

    return listo(interior), listo(vidrio)
