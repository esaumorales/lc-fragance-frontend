"""
Como se ilumina el frasco: set, materiales y composicion de las dos pasadas.

Va aparte del rasterizador (que no sabe de luz) y de la geometria (que no sabe
de color), porque es lo unico que se toca cuando el frasco no termina de verse
bien.

El vidrio se rasteriza en su propia pasada y se compone sobre el interior: con
un solo z-buffer opaco no hay transparencia, y un frasco sin vidrio parece
plastico.
"""

import math

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import geometria_frasco as geo
from rasterizador import Camara, normalizar, normalizar_filas, tonemapear

# Mismo encuadre que tenia la escena de three.js.
CAMARA = Camara([0.0, 0.15, 5.2], [0.0, -0.05, 0.0], math.radians(30))


def a_lineal(hexa):
    """De sRGB a lineal: sombrear en sRGB apaga los medios tonos."""
    valor = hexa.lstrip("#")
    canales = np.array([int(valor[i : i + 2], 16) for i in (0, 2, 4)]) / 255.0
    return canales ** 2.2


# --------------------------------------------------------------------------
# Luces y ambiente
# --------------------------------------------------------------------------

CLAVE_DIR = normalizar(np.array([0.52, 0.70, 0.48]))      # calida, arriba a la derecha
CONTRA_DIR = normalizar(np.array([-0.70, 0.30, -0.64]))   # dorada detras, a la izquierda
RELLENO_DIR = normalizar(np.array([-0.30, -0.40, 0.82]))  # fria desde abajo

CLAVE_COLOR = np.array([1.00, 0.96, 0.88])
CONTRA_COLOR = np.array([0.83, 0.69, 0.22])
RELLENO_COLOR = np.array([0.46, 0.54, 0.72])

CIELO = np.array([0.30, 0.34, 0.44])
HORIZONTE = np.array([0.46, 0.40, 0.33])
SUELO = np.array([0.09, 0.08, 0.07])


def ambiente(normal):
    """Hemisferico: un ambiente constante aplana y todo queda como arcilla."""
    arriba = np.clip(normal[:, 1:2], -1.0, 1.0)
    cielo = np.clip(arriba, 0.0, 1.0) ** 0.75
    suelo = np.clip(-arriba, 0.0, 1.0) ** 0.75
    horizonte = np.clip(1.0 - cielo - suelo, 0.0, 1.0)
    return CIELO * cielo + HORIZONTE * horizonte + SUELO * suelo


def _base_ortonormal(frente):
    arriba = np.array([0.0, 1.0, 0.0])
    if abs(frente @ arriba) > 0.95:
        arriba = np.array([0.0, 0.0, 1.0])
    derecha = normalizar(np.cross(arriba, frente))
    return derecha, np.cross(frente, derecha)


def _suavizar(valor):
    v = np.clip(valor, 0.0, 1.0)
    return v * v * (3.0 - 2.0 * v)


class Panel:
    """Un tacho rectangular del set, como los Lightformer de la escena 3D."""

    def __init__(self, direccion, ancho, alto, color, intensidad, difusion=0.10):
        self.frente = normalizar(np.asarray(direccion, dtype=np.float64))
        self.derecha, self.arriba = _base_ortonormal(self.frente)
        self.ancho = ancho
        self.alto = alto
        self.color = a_lineal(color) * intensidad
        self.difusion = difusion

    def aporte(self, direcciones):
        z = direcciones @ self.frente
        delante = z > 1e-3
        brillo = np.zeros((len(direcciones), 1))
        if not delante.any():
            return brillo

        d = direcciones[delante]
        zz = z[delante]
        ax = np.abs(np.arctan2(d @ self.derecha, zz))
        ay = np.abs(np.arctan2(d @ self.arriba, zz))
        borde = _suavizar((self.ancho - ax) / self.difusion + 0.5) * _suavizar(
            (self.alto - ay) / self.difusion + 0.5
        )
        brillo[delante] = borde[:, None]
        return brillo


# Un ambiente liso deja el oro como plastico amarillo: lo que lo vuelve metal
# es reflejar paneles brillantes separados por sombra.
PANELES = [
    Panel([0.62, 0.42, 0.52], 0.16, 0.80, "#f7f3e8", 11.0, 0.07),   # clave, barra alta
    Panel([-0.66, 0.20, 0.38], 0.12, 0.62, "#d4af37", 7.0, 0.09),   # dorada de costado
    Panel([0.05, 0.88, -0.45], 0.85, 0.22, "#fbf9f4", 4.5, 0.14),   # cenital ancha
    Panel([-0.25, 0.10, -0.92], 0.40, 0.45, "#c8b48a", 2.2, 0.20),  # recorte trasero
    # Rebote frontal, grande y tenue. Sin el, la cara plana del vidrio refleja
    # el vacio y el frasco queda como una placa negra: es el carton blanco que
    # se pone al lado de la camara en cualquier foto de producto.
    Panel([0.12, 0.22, 0.97], 0.80, 0.58, "#e9e4d8", 1.7, 0.40),
]


def entorno(direccion, rugosidad=0.0):
    """
    El set visto en esa direccion: fondo tenue mas los paneles.

    La rugosidad no desenfoca de verdad, mezcla hacia el gradiente liso: para
    un fotograma horneado la diferencia no se nota y evita integrar nada.
    """
    liso = ambiente(direccion)
    nitido = liso.copy()
    for panel in PANELES:
        nitido = nitido + panel.color * panel.aporte(direccion)
    mezcla = np.clip(rugosidad / 0.35, 0.0, 1.0)
    return nitido * (1.0 - mezcla) + liso * mezcla


def especular(normal, dir_vista, luz_dir, rugosidad):
    """Blinn-Phong normalizado; el exponente sale de la rugosidad."""
    medio = normalizar_filas(luz_dir + dir_vista)
    ndh = np.clip(np.einsum("ij,ij->i", normal, medio), 0.0, 1.0)[:, None]
    exponente = min(max(2.0 / (rugosidad ** 4 + 1e-4) - 2.0, 8.0), 4096.0)
    return ndh ** exponente * (exponente + 8.0) / (8.0 * math.pi)


def reflejo(normal, dir_vista):
    ndv = np.einsum("ij,ij->i", normal, dir_vista)[:, None]
    return normalizar_filas(2.0 * ndv * normal - dir_vista)


def fresnel(normal, dir_vista, potencia=4.0):
    de_frente = np.clip(np.einsum("ij,ij->i", normal, dir_vista), 0.0, 1.0)[:, None]
    return (1.0 - de_frente) ** potencia


# --------------------------------------------------------------------------
# Materiales
# --------------------------------------------------------------------------

LIQUIDO_COLOR = a_lineal("#b8860b")
ORO_COLOR = a_lineal("#d4af37")
TAPA_COLOR = a_lineal("#161411")
VIDRIO_TINTE = np.array([0.90, 0.93, 1.00])


def dielectrico(albedo, normal, dir_vista, rugosidad, fuerza_spec=0.35, reflectividad=0.0):
    ndl = np.clip(normal @ CLAVE_DIR, 0.0, 1.0)[:, None]
    ndf = np.clip(normal @ RELLENO_DIR, 0.0, 1.0)[:, None]
    ndc = np.clip(normal @ CONTRA_DIR, 0.0, 1.0)[:, None]

    difuso = albedo * (ambiente(normal) + 1.25 * ndl * CLAVE_COLOR + 0.22 * ndf * RELLENO_COLOR)
    borde = CONTRA_COLOR * (ndc ** 1.6) * fresnel(normal, dir_vista, 3.0) * 1.5
    brillo = CLAVE_COLOR * especular(normal, dir_vista, CLAVE_DIR, rugosidad) * fuerza_spec
    # Una laca oscura casi no tiene difuso: lo que se ve es el set reflejado.
    espejo = reflectividad * entorno(reflejo(normal, dir_vista), rugosidad) if reflectividad else 0.0
    return difuso + borde + brillo + espejo


def metal(albedo, normal, dir_vista, rugosidad):
    """
    Sin difuso: en un metal el color vive en el reflejo.

    El reflejo se aclara de canto (Fresnel): sin eso los bordes del oro se
    apagan y la pieza parece pintada en vez de pulida.
    """
    reflejado = entorno(reflejo(normal, dir_vista), rugosidad)
    al_ras = 0.08 + 0.92 * (1.0 - fresnel(normal, dir_vista, 5.0))
    brillo = CLAVE_COLOR * especular(normal, dir_vista, CLAVE_DIR, rugosidad) * 0.8
    return albedo * reflejado * al_ras + albedo * brillo


def liquido(normal, dir_vista, altura, color=None):
    """
    El perfume dentro del frasco.

    La columna de liquido absorbe: abajo el camino optico es mas largo y el
    tono se va a coñac, arriba queda luminoso. Sin ese degradado el frasco se
    ve como un bloque de plastico de un solo color.
    """
    base = LIQUIDO_COLOR if color is None else color
    t = np.clip((altura[:, None] + 0.70) / 1.12, 0.0, 1.0)
    profundo = base * np.array([0.55, 0.30, 0.10])
    tenido = profundo + (base - profundo) * (t ** 0.8)

    ndl = np.clip(normal @ CLAVE_DIR, 0.0, 1.0)[:, None]
    difuso = tenido * (ambiente(normal) * 0.8 + 1.15 * ndl * CLAVE_COLOR)
    # La luz que cruza el frasco y sale por el otro lado.
    traspaso = tenido * (0.45 + 0.85 * t) * 1.25
    brillo = CLAVE_COLOR * especular(normal, dir_vista, CLAVE_DIR, 0.18) * 0.5
    borde = CONTRA_COLOR * fresnel(normal, dir_vista, 2.6) * 0.9
    return difuso + traspaso + brillo + borde


def etiqueta_textura(lado=512):
    """La etiqueta, dibujada a la medida de la cara frontal."""
    imagen = Image.new("RGB", (lado, lado), "#0b0b0b")
    dibujo = ImageDraw.Draw(imagen)
    dibujo.rectangle([20, 20, lado - 20, lado - 20], outline="#d4af37", width=5)

    def tipografia(nombre, tamano):
        try:
            return ImageFont.truetype(nombre, tamano)
        except OSError:
            return ImageFont.load_default(tamano)

    def centrado(texto, y, fuente, color):
        ancho = dibujo.textlength(texto, font=fuente)
        dibujo.text(((lado - ancho) / 2, y), texto, font=fuente, fill=color)

    centrado("LC", 95, tipografia("georgia.ttf", 140), "#d4af37")
    centrado("FRAGANCE", 262, tipografia("georgia.ttf", 42), "#d4af37")
    dibujo.rectangle([180, 340, 332, 342], fill="#d4af37")
    centrado("EAU DE PARFUM", 378, tipografia("arial.ttf", 23), "#f5f1e7")
    return np.asarray(imagen, dtype=np.float64) / 255.0


def muestrear(textura, u, v):
    """Bilineal, con la V dada vuelta porque la imagen crece hacia abajo."""
    alto, ancho, _ = textura.shape
    x = np.clip(u, 0.0, 1.0) * (ancho - 1)
    y = np.clip(1.0 - v, 0.0, 1.0) * (alto - 1)
    x0, y0 = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
    x1, y1 = np.minimum(x0 + 1, ancho - 1), np.minimum(y0 + 1, alto - 1)
    fx, fy = (x - x0)[:, None], (y - y0)[:, None]
    arriba = textura[y0, x0] * (1 - fx) + textura[y0, x1] * fx
    abajo = textura[y1, x0] * (1 - fx) + textura[y1, x1] * fx
    return arriba * (1 - fy) + abajo * fy


def sombrear_interior(frag, textura, color_liquido=None):
    normal, vista = frag.normal, frag.dir_vista
    material = np.round(frag.atributos[:, 2]).astype(np.int64)
    color = np.zeros((len(normal), 3))

    def aplicar(indice, calcular):
        mascara = material == indice
        if mascara.any():
            color[mascara] = calcular(mascara)

    aplicar(geo.LIQUIDO, lambda m: liquido(normal[m], vista[m], frag.atributos[m, 3], color_liquido))
    aplicar(geo.ORO, lambda m: metal(ORO_COLOR, normal[m], vista[m], 0.14))
    aplicar(geo.TAPA, lambda m: dielectrico(TAPA_COLOR, normal[m], vista[m], 0.10, 2.2, 0.16))
    aplicar(
        geo.ETIQUETA,
        lambda m: dielectrico(
            muestrear(textura, frag.atributos[m, 0], frag.atributos[m, 1]) ** 2.2,
            normal[m],
            vista[m],
            0.48,
            0.2,
        ),
    )
    return color


def sombrear_vidrio(frag):
    """
    Devuelve color y cuanto tapa: casi nada de frente, mucho al ras.

    Lo que hace que se lea como vidrio y no como una placa gris es el canto:
    el borde devuelve casi todo el set y por eso queda ese filo brillante que
    dibuja la silueta. De frente apenas tiñe, y se ve lo de atras.
    """
    normal, vista = frag.normal, frag.dir_vista
    borde = fresnel(normal, vista, 2.4)

    reflejado = entorno(reflejo(normal, vista), 0.02)
    brillo = CLAVE_COLOR * especular(normal, vista, CLAVE_DIR, 0.05) * 1.4
    color = VIDRIO_TINTE * reflejado * (0.35 + 1.5 * borde) + brillo

    # El brillo tambien suma opacidad: un reflejo fuerte tapa lo que hay
    # detras. Si solo contara el Fresnel, el especular de la cara frontal se
    # multiplicaria por 0.03 y no se veria ningun destello en el vidrio.
    destello = np.clip(brillo.mean(axis=1, keepdims=True) * 0.8, 0.0, 1.0)
    opacidad = np.clip(0.08 + 0.92 * borde + destello, 0.0, 1.0)
    return color, opacidad


def componer(interior, vidrio, textura, ancho, alto, color_liquido=None):
    """Vidrio sobre interior, respetando cual de los dos esta mas cerca."""
    rgb = np.zeros((alto, ancho, 3))
    alfa = np.zeros((alto, ancho))

    rgb[interior.cubierto] = sombrear_interior(interior, textura, color_liquido)
    alfa[interior.cubierto] = 1.0

    # Solo donde el vidrio queda delante: por detras lo tapa el liquido.
    delante = vidrio.cubierto & (vidrio.profundidad < interior.profundidad)
    if delante.any():
        visibles = delante[vidrio.cubierto]
        color_v, opacidad_v = sombrear_vidrio(vidrio)
        color_v, opacidad_v = color_v[visibles], opacidad_v[visibles]

        fondo = rgb[delante]
        alfa_fondo = alfa[delante][:, None]
        alfa_salida = opacidad_v + alfa_fondo * (1.0 - opacidad_v)
        rgb[delante] = (color_v * opacidad_v + fondo * alfa_fondo * (1.0 - opacidad_v)) / np.maximum(
            alfa_salida, 1e-6
        )
        alfa[delante] = alfa_salida[:, 0]

    visible = alfa > 0
    salida = np.zeros((alto, ancho, 4))
    salida[visible, :3] = tonemapear(rgb[visible])
    salida[:, :, 3] = alfa
    return salida
