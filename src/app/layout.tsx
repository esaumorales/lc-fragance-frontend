import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthModal } from "@/components/organisms/AuthModal";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { ThemeProvider, themeInitScript } from "@/lib/theme-context";

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-sans",
});

// Cormorant Garamond en lugar de Cinzel: Cinzel es capital romana, pesada y
// monumental. Para perfumería y lujo manda una garamond de contraste alto en
// peso liviano y tamaño grande.
const cormorant = localFont({
  src: "./fonts/cormorant-latin.woff2",
  display: "swap",
  variable: "--font-serif",
  weight: "300 700",
});

export const metadata: Metadata = {
  title: "LC Fragance | El arte de distinguirte",
  description: "Perfumes y tecnología importados, seleccionados uno por uno.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      data-theme="light"
      // El script de tema cambia data-theme antes de hidratar; la diferencia
      // con el HTML del servidor es intencional.
      suppressHydrationWarning
      className={`${inter.variable} ${cormorant.variable} h-full antialiased`}
    >
      <head>
        {/* Script bloqueante para que no parpadee el tema. React 19 avisa en
            desarrollo que los scripts renderizados dentro de un componente no
            se ejecutan en el cliente; aca no importa, porque solo tiene que
            correr una vez sobre el HTML del servidor, antes de hidratar.
            next/script con beforeInteractive da exactamente el mismo aviso. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>{children}<AuthModal /></CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


