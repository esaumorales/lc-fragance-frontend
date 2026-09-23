"""
Genera la mano del hero (public/models/hand.glb) desde cero, a partir de un
campo de distancia con signo (SDF).

Por que SDF y no primitivas de three.js: un ensamble de capsulas y esferas se
ve como piezas sueltas pegadas por mas que se afine la pose. Un SDF con fusion
suave (smooth minimum) produce UNA sola superficie continua, y ademas permite
RESTAR pliegues en las articulaciones y el hueco de la palma, que es lo que
termina de sacarle el aspecto de maniqui.

Todo el calculo pesado corre aca, offline. El navegador solo baja el GLB.

Requiere:  pip install numpy scikit-image trimesh fast-simplification
Uso:       python scripts/build-hand-model.py
"""

import json
import os
import struct

import numpy as np
import trimesh
import fast_simplification
import xatlas
from PIL import Image
from skimage import measure

MODELS = os.path.join(os.path.dirname(__file__), "..", "assets", "hand")
DST = os.path.join(MODELS, "hand.glb")
DST_TEX = os.path.join(MODELS, "hand-skin.jpg")
TEX_SIZE = 1024
VOXEL = 0.0072
TARGET_FACES = 16000


# --------------------------------------------------------------------------
# Primitivas de SDF. Todas reciben P como (N, 3) y devuelven (N,).
# --------------------------------------------------------------------------

def sd_capsule(P, a, b, ra, rb):
    """Capsula de radio variable: el hueso basico del esqueleto."""
    a = np.asarray(a, np.float32)
    b = np.asarray(b, np.float32)
    ba = b - a
    denom = float(ba @ ba)
    t = np.clip(((P - a) @ ba) / denom, 0.0, 1.0)
    closest = a + t[:, None] * ba
    d = np.linalg.norm(P - closest, axis=1)
    return d - (ra + (rb - ra) * t)


def sd_capsule_flat(P, a, b, ra, rb, flat):
    """Capsula achatada en Y: la muñeca y el antebrazo son ovalados, no redondos."""
    scale = np.array([1.0, 1.0 / flat, 1.0], np.float32)
    return flat * sd_capsule(
        P * scale, np.asarray(a, np.float32) * scale, np.asarray(b, np.float32) * scale, ra, rb
    )


def sd_sphere(P, c, r):
    return np.linalg.norm(P - np.asarray(c, np.float32), axis=1) - r


def sd_ellipsoid(P, c, r):
    """Aproximacion de SDF de elipsoide (Inigo Quilez)."""
    r = np.asarray(r, np.float32)
    q = (P - np.asarray(c, np.float32)) / r
    k0 = np.linalg.norm(q, axis=1)
    k1 = np.linalg.norm(q / r, axis=1)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-6)


def sd_round_box(P, c, half, rad):
    q = np.abs(P - np.asarray(c, np.float32)) - np.asarray(half, np.float32)
    outside = np.linalg.norm(np.maximum(q, 0.0), axis=1)
    inside = np.minimum(q.max(axis=1), 0.0)
    return outside + inside - rad


def smin(a, b, k):
    """Union suave: funde las piezas en una sola superficie."""
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b * (1.0 - h) + a * h - k * h * (1.0 - h)


def ssub(d, cut, k):
    """Resta suave: talla pliegues y huecos sin dejar aristas."""
    h = np.clip(0.5 - 0.5 * (d + cut) / k, 0.0, 1.0)
    return d * (1.0 - h) - cut * h + k * h * (1.0 - h)


# --------------------------------------------------------------------------
# Esqueleto. Ejes: +x lado del pulgar, +y dorso, +z hacia las yemas.
# --------------------------------------------------------------------------

def rot_x(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def rot_y(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def rodrigues(axis, ang):
    axis = axis / np.linalg.norm(axis)
    K = np.array([
        [0, -axis[2], axis[1]],
        [axis[2], 0, -axis[0]],
        [-axis[1], axis[0], 0],
    ])
    return np.eye(3) + np.sin(ang) * K + (1 - np.cos(ang)) * (K @ K)


def finger_chain(base, splay, droop, lengths, radii, curls):
    """
    Cinematica directa de un dedo. La curvatura se acumula: la falange media
    hereda el angulo de la proximal, como en un dedo real.

    Devuelve (huesos, articulaciones). Cada articulacion trae la direccion
    hacia la palma, que es donde va tallado el pliegue.
    """
    basis = rot_y(splay) @ rot_x(droop)
    forward = basis @ np.array([0.0, 0.0, 1.0])
    side = rot_y(splay) @ np.array([1.0, 0.0, 0.0])
    palmward = basis @ np.array([0.0, -1.0, 0.0])

    bones, joints = [], []
    p = np.array(base, float)
    cum = 0.0
    for i, (length, curl) in enumerate(zip(lengths, curls)):
        cum += curl
        turn = rodrigues(side, cum)
        q = p + (turn @ forward) * length
        bones.append((p.copy(), q.copy(), radii[i], radii[i + 1]))
        if i > 0:
            joints.append((p.copy(), radii[i], turn @ palmward, side))
        p = q
    return bones, joints


# Mano izquierda: con la palma hacia arriba y los dedos hacia la izquierda es
# la unica que deja el pulgar arriba en el encuadre del hero.
FINGERS = [
    # nombre,  base,                    splay, droop, largos,                radios,                        curvas
    ("indice", (0.190, 0.012, 0.300), 0.20, -0.02, [0.260, 0.155, 0.110], [0.077, 0.072, 0.066, 0.058], [0.15, 0.25, 0.22]),
    ("medio", (0.065, 0.018, 0.335), 0.06, -0.03, [0.285, 0.175, 0.115], [0.079, 0.074, 0.067, 0.060], [0.13, 0.23, 0.20]),
    ("anular", (-0.065, 0.012, 0.325), -0.09, -0.02, [0.265, 0.165, 0.112], [0.075, 0.071, 0.062, 0.055], [0.16, 0.26, 0.23]),
    ("menique", (-0.185, 0.000, 0.272), -0.24, 0.01, [0.208, 0.124, 0.094], [0.065, 0.060, 0.054, 0.048], [0.20, 0.30, 0.27]),
]

THUMB = ((0.130, -0.045, -0.185), 0.72, 0.14, [0.245, 0.165, 0.115], [0.100, 0.089, 0.077, 0.065], [0.05, 0.26, 0.26])


def build_field(P):
    """Arma la mano entera como un solo campo de distancia."""
    # Palma: caja redondeada, mas ancha en los nudillos que en la muñeca.
    d = sd_round_box(P, (0.0, 0.0, 0.050), (0.200, 0.042, 0.205), 0.070)
    d = smin(d, sd_round_box(P, (0.012, 0.0, -0.205), (0.132, 0.036, 0.088), 0.066), 0.06)

    # Monte del pulgar y monte del meñique, del lado de la palma.
    d = smin(d, sd_ellipsoid(P, (0.175, -0.030, -0.030), (0.100, 0.072, 0.205)), 0.07)
    d = smin(d, sd_ellipsoid(P, (-0.200, -0.022, -0.090), (0.070, 0.060, 0.180)), 0.06)
    # Domo del dorso: la mano no es una losa plana.
    d = smin(d, sd_ellipsoid(P, (-0.010, 0.032, 0.028), (0.172, 0.055, 0.192)), 0.08)

    # Antebrazo, achatado y saliendo del encuadre.
    d = smin(d, sd_capsule_flat(P, (0.010, 0.0, -0.280), (0.010, 0.010, -0.980), 0.132, 0.112, 0.70), 0.085)

    creases = []

    chains = [finger_chain(b, s, dr, L, R, C) for _, b, s, dr, L, R, C in FINGERS]
    chains.append(finger_chain(*THUMB))

    for bones, joints in chains:
        for a, b, ra, rb in bones:
            d = smin(d, sd_capsule(P, a, b, ra, rb), 0.038)
        # Nudillo: leve engrosamiento en cada articulacion.
        for pos, r, palmward, side in joints:
            d = smin(d, sd_sphere(P, pos, r * 1.08), 0.028)
            # Pliegue: surco transversal del lado de la palma.
            centre = pos + palmward * (r * 0.98)
            creases.append((centre - side * r * 1.7, centre + side * r * 1.7, r * 0.3))

    # Arranque de los dedos: pliegue en la base, contra la palma.
    for (_, base, splay, _, _, radii, _) in FINGERS:
        pos = np.array(base, float) + np.array([0.0, -radii[0] * 0.95, 0.0])
        side = rot_y(splay) @ np.array([1.0, 0.0, 0.0])
        creases.append((pos - side * radii[0] * 1.5, pos + side * radii[0] * 1.5, radii[0] * 0.28))

    # Hueco de la palma: una esfera enorme restada apenas por debajo de la
    # superficie. Es lo que hace que la mano se lea ahuecada y no como tabla.
    d = ssub(d, sd_sphere(P, (0.0, -0.668, 0.040), 0.560), 0.09)

    for a, b, r in creases:
        d = ssub(d, sd_capsule(P, a, b, r, r), 0.022)

    return d



# --------------------------------------------------------------------------
# Texturizado. El color plano es lo que sigue delatando a un "modelo 3D": una
# mano real tiene las yemas y los nudillos mas rojos, y sombra propia
# acumulada en los pliegues y entre los dedos.
# --------------------------------------------------------------------------

def value_noise_3d(P, cells, rng):
    """Ruido de valor 3D. Se evalua en coordenadas del objeto y no en UV, para
    que no se corte en las costuras del atlas."""
    grid = rng.random((cells, cells, cells)).astype(np.float32)
    f = P * cells
    base = np.floor(f).astype(np.int64)
    t = f - base
    t = t * t * (3.0 - 2.0 * t)

    def corner(dx, dy, dz):
        idx = (base + np.array([dx, dy, dz])) % cells
        return grid[idx[:, 0], idx[:, 1], idx[:, 2]]

    def lerp(a, b, w):
        return a + (b - a) * w

    c00 = lerp(corner(0, 0, 0), corner(1, 0, 0), t[:, 0])
    c10 = lerp(corner(0, 1, 0), corner(1, 1, 0), t[:, 0])
    c01 = lerp(corner(0, 0, 1), corner(1, 0, 1), t[:, 0])
    c11 = lerp(corner(0, 1, 1), corner(1, 1, 1), t[:, 0])
    return lerp(lerp(c00, c10, t[:, 1]), lerp(c01, c11, t[:, 1]), t[:, 2])


def rasterize_atlas(uvs, faces, verts, normals, size):
    """Recorre los triangulos en espacio de textura y guarda, por texel, la
    posicion y la normal del punto de la malla que le corresponde."""
    pos = np.zeros((size, size, 3), np.float32)
    nrm = np.zeros((size, size, 3), np.float32)
    filled = np.zeros((size, size), bool)
    uv_px = uvs * (size - 1)

    for tri in faces:
        a, b, c = uv_px[tri]
        x0 = max(int(np.floor(min(a[0], b[0], c[0]))) - 1, 0)
        x1 = min(int(np.ceil(max(a[0], b[0], c[0]))) + 1, size - 1)
        y0 = max(int(np.floor(min(a[1], b[1], c[1]))) - 1, 0)
        y1 = min(int(np.ceil(max(a[1], b[1], c[1]))) + 1, size - 1)
        if x1 < x0 or y1 < y0:
            continue

        e1 = b - a
        e2 = c - a
        denom = e1[0] * e2[1] - e2[0] * e1[1]
        if abs(denom) < 1e-12:
            continue

        xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        px = xs.ravel() - a[0]
        py = ys.ravel() - a[1]
        w1 = (px * e2[1] - py * e2[0]) / denom
        w2 = (py * e1[0] - px * e1[1]) / denom
        w0 = 1.0 - w1 - w2
        # Margen negativo: cubre tambien el borde y evita costuras claras.
        inside = (w0 > -0.05) & (w1 > -0.05) & (w2 > -0.05)
        if not inside.any():
            continue

        yy = ys.ravel()[inside]
        xx = xs.ravel()[inside]
        bary = np.stack([w0[inside], w1[inside], w2[inside]], axis=1)
        pos[yy, xx] = bary @ verts[tri]
        nrm[yy, xx] = bary @ normals[tri]
        filled[yy, xx] = True

    return pos, nrm, filled


def dilate(image, filled, passes=8):
    """Expande el color hacia los texels vacios. Sin esto, al filtrar la
    textura se cuelan lineas de fondo en cada costura del atlas."""
    out = image.copy()
    done = filled.copy()
    for _ in range(passes):
        holes = ~done
        if not holes.any():
            break
        acc = np.zeros_like(out)
        cnt = np.zeros(done.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            acc += np.roll(out, (dy, dx), axis=(0, 1)) * np.roll(done, (dy, dx), axis=(0, 1))[..., None]
            cnt += np.roll(done, (dy, dx), axis=(0, 1))
        grown = holes & (cnt > 0)
        out[grown] = acc[grown] / cnt[grown][..., None]
        done |= grown
    return out


def bake_skin_texture(verts, faces, normals, uvs, size):
    print("horneando textura de piel", size, "x", size)
    pos, nrm, filled = rasterize_atlas(uvs, faces, verts, normals, size)
    print("  texels cubiertos:", int(filled.sum()), "(" + str(round(100 * filled.mean())) + "%)")

    P = pos[filled].astype(np.float32)
    N = nrm[filled].astype(np.float32)
    N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-6)

    # Oclusion ambiental leida del propio SDF: si a distancia d de la
    # superficie el campo vale bastante menos que d, es porque hay geometria
    # alrededor (un pliegue, el hueco entre dos dedos, la palma ahuecada).
    steps = (0.012, 0.028, 0.055, 0.095)
    ao = np.zeros(len(P), np.float32)
    for step in steps:
        ao += np.clip(build_field(P + N * step) / step, 0.0, 1.0)
    ao = np.clip(ao / len(steps), 0.0, 1.0) ** 0.85

    rng = np.random.default_rng(7)
    mottle = (
        0.45 * value_noise_3d(P * 11.0, 16, rng)
        + 0.35 * value_noise_3d(P * 26.0, 16, rng)
        + 0.20 * value_noise_3d(P * 55.0, 16, rng)
    )

    base = np.array([0.760, 0.545, 0.435], np.float32)
    tip = np.array([0.740, 0.430, 0.350], np.float32)
    arm = np.array([0.700, 0.505, 0.405], np.float32)

    # Mas irrigacion hacia las yemas, menos hacia el antebrazo.
    flush = np.clip((P[:, 2] + 0.18) / 0.78, 0.0, 1.0)
    forearm = np.clip((-P[:, 2] - 0.30) / 0.45, 0.0, 1.0)

    colour = base[None, :] + (tip - base)[None, :] * flush[:, None]
    colour = colour + (arm - base)[None, :] * forearm[:, None]
    colour *= (0.66 + 0.34 * ao)[:, None]
    colour *= (0.975 + 0.05 * mottle)[:, None]

    image = np.zeros((size, size, 3), np.float32)
    image[filled] = np.clip(colour, 0.0, 1.0)
    image = dilate(image, filled)

    Image.fromarray((image * 255).astype(np.uint8)).save(DST_TEX, quality=90)
    print("  escrito:", os.path.abspath(DST_TEX), os.path.getsize(DST_TEX) // 1024, "KB")



def strip_embedded_material(glb):
    """Saca el material, la imagen y la textura que trimesh mete por defecto.

    El material lo define la app (ver components/three/skin.ts), asi que lo
    unico que hace el embebido es obligar al cargador a resolver una imagen
    que despues se descarta. Los bufferViews se dejan como estan: reindexarlos
    ahorraria 80 bytes y arriesgaria romper los accesores.
    """
    header = struct.unpack("<III", glb[:12])
    off = 12
    chunks = []
    while off < len(glb):
        length, kind = struct.unpack("<II", glb[off:off + 8])
        chunks.append([kind, glb[off + 8:off + 8 + length]])
        off += 8 + length

    js = json.loads(chunks[0][1].decode("utf-8"))
    for key in ("materials", "images", "textures", "samplers"):
        js.pop(key, None)
    for mesh in js.get("meshes", []):
        for prim in mesh.get("primitives", []):
            prim.pop("material", None)

    payload = json.dumps(js, separators=(",", ":")).encode("utf-8")
    payload += b" " * ((4 - len(payload) % 4) % 4)
    chunks[0][1] = payload

    body = b""
    for kind, data in chunks:
        body += struct.pack("<II", len(data), kind) + data
    return struct.pack("<III", header[0], header[1], 12 + len(body)) + body


def main():
    lo = np.array([-0.44, -0.30, -1.52], np.float32)
    hi = np.array([0.62, 0.26, 1.02], np.float32)
    dims = np.maximum(np.ceil((hi - lo) / VOXEL).astype(int), 4)
    print("grilla:", dims, "=", int(np.prod(dims)), "celdas")

    axes = [lo[i] + np.arange(dims[i], dtype=np.float32) * VOXEL for i in range(3)]
    P = np.stack(np.meshgrid(*axes, indexing="ij"), axis=-1).reshape(-1, 3)

    field = build_field(P).reshape(dims).astype(np.float32)
    print("campo listo, rango:", float(field.min()), float(field.max()))

    verts, faces, _, _ = measure.marching_cubes(
        field, level=0.0, spacing=(VOXEL, VOXEL, VOXEL)
    )
    verts += lo
    print("marching cubes:", len(verts), "vertices,", len(faces), "caras")

    mesh = trimesh.Trimesh(vertices=verts, faces=faces, process=True)
    # El marching cubes deja escalones del tamaño del voxel: Taubin los quita
    # sin encoger el volumen (a diferencia de un Laplaciano simple).
    trimesh.smoothing.filter_taubin(mesh, lamb=0.5, nu=-0.53, iterations=12)

    v, f = fast_simplification.simplify(
        np.asarray(mesh.vertices, dtype=np.float32),
        np.asarray(mesh.faces, dtype=np.int32),
        target_count=TARGET_FACES,
    )
    mesh = trimesh.Trimesh(vertices=v, faces=f, process=True)
    print("decimado:", len(mesh.vertices), "vertices,", len(mesh.faces), "caras")

    mesh.apply_translation(-mesh.bounds.mean(axis=0))
    mesh.apply_scale(2.0 / max(mesh.extents))
    mesh.fix_normals()
    print("extents finales:", mesh.extents)

    # Normales suaves ANTES de desplegar las UV: xatlas duplica vertices en
    # las costuras, y si se recalculan despues cada copia promedia solo sus
    # caras, dejando una linea de sombreado visible en cada costura.
    smooth_normals = np.asarray(mesh.vertex_normals, np.float32).copy()

    vmapping, indices, uvs = xatlas.parametrize(
        np.asarray(mesh.vertices, np.float32), np.asarray(mesh.faces, np.uint32)
    )
    verts = np.asarray(mesh.vertices, np.float32)[vmapping]
    normals = smooth_normals[vmapping]
    faces = np.asarray(indices, np.int64)
    uvs = np.asarray(uvs, np.float32)
    print("atlas UV:", len(verts), "vertices tras separar costuras")

    # Ojo con la V: trimesh guarda las UV con origen abajo a la izquierda y
    # las invierte al exportar a glTF. Por eso el material de la app carga la
    # textura con flipY activo, para deshacer esa inversion.
    bake_skin_texture(verts, faces, normals, uvs, TEX_SIZE)

    # process=False: reordenar o fusionar vertices romperia la correspondencia
    # con las UV que acaba de calcular xatlas.
    textured = trimesh.Trimesh(vertices=verts, faces=faces, process=False)
    textured.vertex_normals = normals
    textured.visual = trimesh.visual.TextureVisuals(uv=uvs)

    out = os.path.abspath(DST)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    glb = trimesh.exchange.gltf.export_glb(textured, include_normals=True)
    with open(out, "wb") as handle:
        handle.write(strip_embedded_material(glb))
    print("escrito:", out, os.path.getsize(out) // 1024, "KB")


if __name__ == "__main__":
    main()
