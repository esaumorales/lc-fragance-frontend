import { API_BASE } from "@/lib/api-base";

type Firma = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  maximoBytes: number;
  formatos: string[];
};

function megas(bytes: number) {
  return Math.round(bytes / (1024 * 1024));
}

/**
 * Sube el comprobante a Cloudinary y devuelve su URL.
 *
 * El archivo va directo a Cloudinary con una firma del backend: asi la clave
 * nunca sale del servidor y el archivo no pasa por la API.
 *
 * El limite no se anuncia de entrada; el aviso aparece solo si lo pasan.
 */
export async function subirVoucher(archivo: File): Promise<string> {
  const respuesta = await fetch(`${API_BASE}/api/uploads/voucher`, { method: "POST" });
  if (!respuesta.ok) {
    throw new Error("No se puede adjuntar el comprobante ahora. Probá más tarde.");
  }
  const firma: Firma = await respuesta.json();

  if (archivo.size > firma.maximoBytes) {
    throw new Error(
      `El archivo pesa ${megas(archivo.size)} MB y el máximo es ${megas(firma.maximoBytes)} MB.`
    );
  }

  const cuerpo = new FormData();
  cuerpo.append("file", archivo);
  cuerpo.append("api_key", firma.apiKey);
  cuerpo.append("timestamp", String(firma.timestamp));
  cuerpo.append("folder", firma.folder);
  cuerpo.append("signature", firma.signature);

  const subida = await fetch(`https://api.cloudinary.com/v1_1/${firma.cloudName}/auto/upload`, {
    method: "POST",
    body: cuerpo,
  });
  if (!subida.ok) throw new Error("No se pudo subir el comprobante");

  const { secure_url } = (await subida.json()) as { secure_url: string };
  return secure_url;
}
