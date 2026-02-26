import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { PostHogPageView } from "@/components/posthog-pageview";
import { defaultMetadata, viewport as seoViewport } from "@/lib/seo-config";
import { ThemeProvider } from "@/lib/theme-provider";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "optional",
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "optional",
});

export const metadata: Metadata = defaultMetadata;
export const viewport: Viewport = seoViewport;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      className={`${inter.className} ${inter.variable} ${instrumentSerif.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <link href="https://umami.damien-schneider.pro" rel="preconnect" />
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            strategy="lazyOnload"
          />
        )}
        <Script
          data-website-id="f4232b19-0136-4892-95b5-05801c29715d"
          src="https://umami.damien-schneider.pro/script.js"
          strategy="lazyOnload"
        />
      </head>
      <body>
        <Suspense fallback={null}>
          <PostHogPageView />
        </Suspense>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
