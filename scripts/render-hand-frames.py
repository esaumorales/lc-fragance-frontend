"""
Renderiza la mano como secuencia de imagenes, al estilo de las paginas de
producto de Apple: en vez de mantener un modelo 3D vivo en el navegador, se
hornean N fotogramas girados y el arrastre del usuario cambia de fotograma.

Ventaja real: sin el presupuesto de un cuadro a 60fps se puede gastar mucho
mas en el sombreado — luz de contorno, dispersion subsuperficial falsa,
supermuestreo — y el resultado es mas bonito que lo que aguanta WebGL en vivo.
Ademas desaparece el costo de three.js para la mano.

Entrada:  assets/hand/hand.glb + hand-skin.jpg (insumos, no se sirven)
Salida:   frontend/public/hand/frame-00.webp ... frame-NN.webp

Requiere:  pip install numpy pillow
Uso:       python scripts/render-hand-frames.py
"""

import json
import math
import os
import struct

import numpy as np
from PIL import Image

HERE = os.path.dirname(__file__)
MODEL = os.path.join(HERE, "..", "assets", "hand", "hand.glb")
TEXTURE = os.path.join(HERE, "..", "assets", "hand", "hand-skin.jpg")
OUT_DIR = os.path.join(HERE, "..", "public", "hand")

# Se pueden bajar por variables de entorno para iterar rapido sobre el
# sombreado sin esperar la tanda completa.
FRAMES = int(os.environ.get("HAND_FRAMES", 24))
ARC = math.radians(34)          # barrido total: -17deg a +17deg
WIDTH = int(os.environ.get("HAND_WIDTH", 1180))
HEIGHT = int(os.environ.get("HAND_HEIGHT", 820))
SUPERSAMPLE = int(os.environ.get("HAND_SS", 2))

# Camara y pose: los mismos numeros que usaba la escena de three.js, para que
# el encuadre no cambie respecto de lo que ya estaba aprobado.
CAM_POS = np.array([0.0, 0.9, 4.4])
CAM_TARGET = np.array([0.0, 0.0, 0.0])
FOV_Y = math.radians(32)
HAND_POS = np.array([0.55, -0.45, 0.25])
HAND_SCALE = 1.25


# --------------------------------------------------------------------------
# Lectura del GLB. Se parsea a mano para conservar exactamente las normales y
# las UV exportadas; un cargador generico las recalcula y rompe las costuras.
# --------------------------------------------------------------------------

COMPONENT = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NUM_COMPONENTS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def read_glb(path):
    raw = open(path, "rb").read()
    offset = 12
    chunks = {}
    while offset < len(raw):
        length, kind = struct.unpack("<II", raw[offset : offset + 8])
        chunks[kind] = raw[offset + 8 : offset + 8 + length]
        offset += 8 + length

    gltf = json.loads(chunks[0x4E4F534A].decode("utf-8"))
    binary = chunks[0x004E4942]

    def accessor(index):
        acc = gltf["accessors"][index]
        view = gltf["bufferViews"][acc["bufferView"]]
        start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
        count = acc["count"] * NUM_COMPONENTS[acc["type"]]
        dtype = COMPONENT[acc["componentType"]]
        data = np.frombuffer(binary, dtype=dtype, count=count, offset=start)
        return data.reshape(acc["count"], NUM_COMPONENTS[acc["type"]])

    prim = gltf["meshes"][0]["primitives"][0]
    return (
        accessor(prim["attributes"]["POSITION"]).astype(np.float64),
        accessor(prim["attributes"]["NORMAL"]).astype(np.float64),
        accessor(prim["attributes"]["TEXCOORD_0"]).astype(np.float64),
        accessor(prim["indices"]).astype(np.int64).reshape(-1, 3),
    )


def offer_pose():
    """Misma base de vectores que components/three/Hand.tsx."""
    back = -_normalize(np.array([0.03, 0.98, 0.2]))
    fingers = _normalize(np.array([-0.95, -0.1, 0.3]))
    fingers = _normalize(fingers - back * float(fingers @ back))
    side = _normalize(np.cross(back, fingers))
    return np.column_stack([side, back, fingers])


def _normalize(v):
    return v / np.linalg.norm(v)


def rotation_y(angle):
    c, s = math.cos(angle), math.sin(angle)
    return np.array([[c, 0.0, s], [0.0, 1.0, 0.0], [-s, 0.0, c]])


# --------------------------------------------------------------------------
# Muestreo de textura y sombreado
# --------------------------------------------------------------------------

def sample_bilinear(tex, u, v):
    """La V viene invertida respecto del horneado porque trimesh la da vuelta
    al exportar a glTF (lo mismo que compensa flipY en el material del sitio)."""
    h, w, _ = tex.shape
    x = np.clip(u, 0.0, 1.0) * (w - 1)
    y = np.clip(1.0 - v, 0.0, 1.0) * (h - 1)
    x0 = np.floor(x).astype(np.int64)
    y0 = np.floor(y).astype(np.int64)
    x1 = np.minimum(x0 + 1, w - 1)
    y1 = np.minimum(y0 + 1, h - 1)
    fx = (x - x0)[:, None]
    fy = (y - y0)[:, None]
    top = tex[y0, x0] * (1 - fx) + tex[y0, x1] * fx
    bottom = tex[y1, x0] * (1 - fx) + tex[y1, x1] * fx
    return top * (1 - fy) + bottom * fy


KEY_DIR = _normalize(np.array([0.55, 0.72, 0.42]))       # calida, arriba a la derecha
RIM_DIR = _normalize(np.array([-0.72, 0.28, -0.62]))     # contraluz ambar detras
FILL_DIR = _normalize(np.array([-0.25, -0.55, 0.78]))    # relleno frio desde abajo

KEY_COLOUR = np.array([1.00, 0.94, 0.84])
RIM_COLOUR = np.array([1.00, 0.84, 0.62])
FILL_COLOUR = np.array([0.42, 0.52, 0.70])
SSS_COLOUR = np.array([0.78, 0.34, 0.26])

# Ambiente hemisferico: cielo frio arriba, horizonte calido al medio y rebote
# oscuro abajo. Un ambiente constante aplana la piel; el gradiente por normal
# es lo que da la sensacion de estar dentro de un set iluminado.
SKY_COLOUR = np.array([0.34, 0.39, 0.50])
HORIZON_COLOUR = np.array([0.52, 0.42, 0.35])
GROUND_COLOUR = np.array([0.13, 0.10, 0.09])


def hemispheric_ambient(normal):
    up = np.clip(normal[:, 1:2], -1.0, 1.0)
    sky = np.clip(up, 0.0, 1.0) ** 0.75
    ground = np.clip(-up, 0.0, 1.0) ** 0.75
    horizon = np.clip(1.0 - sky - ground, 0.0, 1.0)
    return SKY_COLOUR * sky + HORIZON_COLOUR * horizon + GROUND_COLOUR * ground


def shade(albedo, normal, view_dir):
    ndl = np.clip(normal @ KEY_DIR, 0.0, 1.0)[:, None]
    ndf = np.clip(normal @ FILL_DIR, 0.0, 1.0)[:, None]
    ndr = np.clip(normal @ RIM_DIR, 0.0, 1.0)[:, None]

    # Fresnel: al ras de la superficie la piel deja pasar luz y se enrojece.
    facing = np.clip(np.einsum("ij,ij->i", normal, view_dir), 0.0, 1.0)[:, None]
    fresnel = (1.0 - facing) ** 3.0

    # Ambiente bajo a proposito: con relleno alto la piel se aplana y queda
    # como arcilla. El volumen lo tiene que dar el contraste entre la clave y
    # la sombra, no una base uniforme.
    diffuse = albedo * (hemispheric_ambient(normal) + 1.15 * ndl * KEY_COLOUR + 0.20 * ndf * FILL_COLOUR)
    rim = RIM_COLOUR * (ndr ** 1.5) * fresnel * 1.55
    sss = SSS_COLOUR * albedo * fresnel * 0.3

    # El vector medio es por pixel: la vista cambia en cada uno.
    half = _normalize_rows(KEY_DIR + view_dir)
    spec = np.clip(np.einsum("ij,ij->i", normal, half), 0.0, 1.0)[:, None] ** 22.0
    specular = KEY_COLOUR * spec * 0.09

    return diffuse + rim + sss + specular


def _normalize_rows(v):
    return v / np.maximum(np.linalg.norm(v, axis=1, keepdims=True), 1e-9)


def tonemap(colour):
    """Filmico corto: evita que la luz de contorno se queme a blanco plano."""
    colour = np.clip(colour, 0.0, None)
    mapped = (colour * (2.51 * colour + 0.03)) / (colour * (2.43 * colour + 0.59) + 0.14)
    return np.clip(mapped, 0.0, 1.0) ** (1.0 / 2.2)


# --------------------------------------------------------------------------
# Rasterizado con z-buffer
# --------------------------------------------------------------------------

def render(V, N, UV, F, tex, width, height):
    forward = _normalize(CAM_TARGET - CAM_POS)
    right = _normalize(np.cross(forward, np.array([0.0, 1.0, 0.0])))
    up = np.cross(right, forward)
    view = np.column_stack([right, up, -forward]).T

    cam = (V - CAM_POS) @ view.T
    cam_n = N @ view.T
    depth = -cam[:, 2]

    focal = 1.0 / math.tan(FOV_Y / 2)
    aspect = width / height
    safe = np.maximum(depth, 1e-6)
    sx = (cam[:, 0] * focal / aspect / safe * 0.5 + 0.5) * (width - 1)
    sy = (1.0 - (cam[:, 1] * focal / safe * 0.5 + 0.5)) * (height - 1)

    zbuf = np.full((height, width), np.inf)
    gbuf_n = np.zeros((height, width, 3))
    gbuf_uv = np.zeros((height, width, 2))
    gbuf_v = np.zeros((height, width, 3))
    covered = np.zeros((height, width), bool)

    for tri in F:
        ax, ay = sx[tri[0]], sy[tri[0]]
        bx, by = sx[tri[1]], sy[tri[1]]
        cx, cy = sx[tri[2]], sy[tri[2]]

        # Descarte de caras traseras en espacio de pantalla.
        area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)
        if area >= -1e-9:
            continue

        x0 = max(int(math.floor(min(ax, bx, cx))), 0)
        x1 = min(int(math.ceil(max(ax, bx, cx))), width - 1)
        y0 = max(int(math.floor(min(ay, by, cy))), 0)
        y1 = min(int(math.ceil(max(ay, by, cy))), height - 1)
        if x1 < x0 or y1 < y0:
            continue

        xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        px = xs.ravel().astype(np.float64)
        py = ys.ravel().astype(np.float64)

        w0 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / area
        w1 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / area
        w2 = 1.0 - w0 - w1
        inside = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
        if not inside.any():
            continue

        w0, w1, w2 = w0[inside], w1[inside], w2[inside]
        yy = ys.ravel()[inside]
        xx = xs.ravel()[inside]

        z = w0 * depth[tri[0]] + w1 * depth[tri[1]] + w2 * depth[tri[2]]
        closer = z < zbuf[yy, xx]
        if not closer.any():
            continue

        yy, xx, z = yy[closer], xx[closer], z[closer]
        w0, w1, w2 = w0[closer], w1[closer], w2[closer]
        bary = np.stack([w0, w1, w2], axis=1)

        zbuf[yy, xx] = z
        gbuf_n[yy, xx] = bary @ cam_n[tri]
        gbuf_uv[yy, xx] = bary @ UV[tri]
        gbuf_v[yy, xx] = bary @ cam[tri]
        covered[yy, xx] = True

    normal = gbuf_n[covered]
    normal /= np.maximum(np.linalg.norm(normal, axis=1, keepdims=True), 1e-9)
    view_dir = -gbuf_v[covered]
    view_dir /= np.maximum(np.linalg.norm(view_dir, axis=1, keepdims=True), 1e-9)

    uv = gbuf_uv[covered]
    albedo = sample_bilinear(tex, uv[:, 0], uv[:, 1])

    rgb = np.zeros((height, width, 3))
    rgb[covered] = tonemap(shade(albedo, normal, view_dir))

    rgba = np.concatenate([rgb, covered[..., None].astype(np.float64)], axis=2)
    return rgba


def downsample(image, factor):
    h, w, c = image.shape
    return image.reshape(h // factor, factor, w // factor, factor, c).mean(axis=(1, 3))


def main():
    positions, normals, uvs, faces = read_glb(os.path.abspath(MODEL))
    print("malla:", len(positions), "vertices,", len(faces), "triangulos")

    tex = np.asarray(Image.open(os.path.abspath(TEXTURE)).convert("RGB"), dtype=np.float64) / 255.0
    # A lineal: el horneado esta en sRGB y sombrear en sRGB apaga los medios.
    tex = tex ** 2.2

    pose = offer_pose()
    os.makedirs(os.path.abspath(OUT_DIR), exist_ok=True)

    hi_w, hi_h = WIDTH * SUPERSAMPLE, HEIGHT * SUPERSAMPLE
    rendered = []

    for index in range(FRAMES):
        t = index / (FRAMES - 1)
        angle = -ARC / 2 + ARC * t
        spin = rotation_y(angle)

        world = (positions @ pose.T) * HAND_SCALE
        world = world @ spin.T + HAND_POS
        world_n = (normals @ pose.T) @ spin.T

        frame = downsample(render(world, world_n, uvs, faces, tex, hi_w, hi_h), SUPERSAMPLE)
        rendered.append((frame * 255).astype(np.uint8))
        print(f"  render {index + 1}/{FRAMES}  {math.degrees(angle):+.1f}deg")

    # Recorte comun a todos los fotogramas: la camara encuadra la escena
    # entera, pero la imagen tiene que ser la mano. Se usa la union de las
    # cajas de alfa para que la mano no salte de posicion entre fotogramas.
    union = np.zeros(rendered[0].shape[:2], bool)
    for frame in rendered:
        union |= frame[:, :, 3] > 8
    rows = np.where(union.any(axis=1))[0]
    cols = np.where(union.any(axis=0))[0]
    margin = 12
    top = max(int(rows[0]) - margin, 0)
    bottom = min(int(rows[-1]) + margin + 1, union.shape[0])
    left = max(int(cols[0]) - margin, 0)
    right = min(int(cols[-1]) + 1, union.shape[1])
    # Sin margen a la derecha y comiendo un poco mas: asi el borde de la
    # imagen corta el antebrazo en vez de mostrar su tapa redondeada.
    right -= int((right - left) * 0.10)
    print(f"recorte: {right - left} x {bottom - top}")

    for index, frame in enumerate(rendered):
        out = os.path.join(os.path.abspath(OUT_DIR), f"frame-{index:02d}.webp")
        Image.fromarray(frame[top:bottom, left:right], mode="RGBA").save(
            out, format="WEBP", quality=82, method=5
        )

    names = [n for n in os.listdir(os.path.abspath(OUT_DIR)) if n.endswith(".webp")]
    total = sum(os.path.getsize(os.path.join(os.path.abspath(OUT_DIR), n)) for n in names)
    print("total:", total // 1024, "KB en", len(names), "fotogramas")


if __name__ == "__main__":
    main()
