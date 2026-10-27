import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ImageSessionProvider } from "@/components/image-session";

export const metadata: Metadata = {
  title: "LumeTraço — transforme imagens em vetores no navegador",
  description: "Vetorização gratuita, privada e independente. Converta PNG, JPG e WebP em SVG, PDF, EPS e DXF diretamente no navegador.",
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="pt-BR"><body><ImageSessionProvider><SiteHeader />{children}<SiteFooter /></ImageSessionProvider></body></html>;
}
