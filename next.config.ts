import type { NextConfig } from "next";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

const nextConfig: NextConfig = {
  images: {
    // El admin puede pegar la URL de imagen de cualquier producto (Cloudinary
    // todavia no esta conectado), asi que se permite cualquier host HTTPS.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },

  // El navegador llama a /api de este mismo origen y Next reenvia al backend.
  // Sirve para que la cookie de sesion sea de primera parte: yendo directo al
  // dominio del backend era de tercera parte y se perdia al recargar.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND}/api/:path*` }];
  },
};

export default nextConfig;
