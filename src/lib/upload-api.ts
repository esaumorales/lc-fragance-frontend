import { authorizedFetch } from "@/lib/authorized-fetch";

type FirmaSubida = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

// Cloudinary rechaza cualquier otra cosa; conviene avisar antes de subir.
const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Sube una imagen a Cloudinary con firma del backend.
 *
 * El archivo va directo de navegador a Cloudinary: el backend solo firma, asi
 * el api secret no sale del servidor ni los archivos pasan por el.
 */
export async function subirImagen(token: string, archivo: File): Promise<string> {
  if (!TIPOS.includes(archivo.type)) {
    throw new Error("Formato no admitido: usá JPG, PNG, WebP o AVIF");
  }
  if (archivo.size > MAX_BYTES) {
    throw new Error("La imagen supera los 8 MB");
  }

  const firma = await authorizedFetch<FirmaSubida>(token, "/api/uploads/signature", {
    method: "POST",
  });

  const cuerpo = new FormData();
  cuerpo.append("file", archivo);
  cuerpo.append("api_key", firma.apiKey);
  cuerpo.append("timestamp", String(firma.timestamp));
  cuerpo.append("folder", firma.folder);
  cuerpo.append("signature", firma.signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${firma.cloudName}/image/upload`, {
    method: "POST",
    body: cuerpo,
  });

  const datos = (await res.json().catch(() => ({}))) as {
    secure_url?: string;
    error?: { message?: string };
  };

  if (!res.ok || !datos.secure_url) {
    throw new Error(datos.error?.message ?? "Cloudinary rechazó la subida");
  }

  return datos.secure_url;
}
