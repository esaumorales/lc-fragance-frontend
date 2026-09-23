import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // El admin puede pegar la URL de imagen de cualquier producto (Cloudinary
    // todavia no esta conectado), asi que se permite cualquier host HTTPS.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
