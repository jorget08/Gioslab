import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ProveedorSesion } from "@/lib/auth/contexto";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GiosLab System",
  description:
    "Prescripción de entrenamiento de fuerza basada en biomecánica y antropometría individual.",
};

/**
 * `viewportFit: "cover"` es imprescindible: sin él, todos los
 * `env(safe-area-inset-*)` devuelven 0 y el contenido queda bajo el notch y la
 * barra inferior del iPhone. Es el interruptor que hace que las áreas seguras
 * existan.
 *
 * No se bloquea el zoom: los campos usan 16px, así que iOS no hace zoom al
 * enfocarlos, y quien necesita ampliar para leer debe poder hacerlo.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fa" },
    { media: "(prefers-color-scheme: dark)", color: "#141c22" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ProveedorSesion>{children}</ProveedorSesion>
      </body>
    </html>
  );
}
