import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import { JsonLd } from "@/components/json-ld";
import { Toaster } from "@/components/ui/sonner";
import { AuthDialog } from "@/features/auth/components/auth-dialog";
import { getToken } from "@/lib/auth-server";
import { Providers } from "@/lib/providers";
import {
  defaultMetadata,
  getHomePageJsonLd,
  viewport as seoViewport,
} from "@/lib/seo-config";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = defaultMetadata;
export const viewport: Viewport = seoViewport;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getToken();
  const jsonLd = getHomePageJsonLd();

  return (
    <html
      className={`${inter.variable} ${instrumentSerif.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        {process.env.NODE_ENV === "development" && (
          <script defer src="//unpkg.com/react-grab/dist/index.global.js" />
        )}
        <script
          data-website-id="f4232b19-0136-4892-95b5-05801c29715d"
          defer
          src="https://umami.damien-schneider.pro/script.js"
        />
        <JsonLd data={jsonLd} />
      </head>
      <body>
        <Providers initialToken={token}>
          {children}
          <Toaster richColors />
          <AuthDialog />
        </Providers>
      </body>
    </html>
  );
}
