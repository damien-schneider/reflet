import { TooltipProvider } from "@ctrl-ui/react/ui/tooltip";
import { env } from "@reflet/env/server";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { Suspense } from "react";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { PostHogPageView } from "@/components/posthog-pageview";
import { RefletDevtools } from "@/components/reflet-devtools";
import { ThemeColorSync } from "@/components/theme-color-sync";
import { defaultMetadata, viewport as seoViewport } from "@/lib/seo-config";
import { ThemeProvider } from "@/lib/theme-provider";

import "./globals.css";

const switzer = localFont({
  display: "swap",
  src: [
    {
      path: "../fonts/switzer/Switzer-Variable.woff2",
      style: "normal",
      weight: "100 900",
    },
    {
      path: "../fonts/switzer/Switzer-VariableItalic.woff2",
      style: "italic",
      weight: "100 900",
    },
  ],
  variable: "--font-switzer",
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
      className={switzer.variable}
      data-skin="refined"
      data-theme="reflet"
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <link href="https://umami.damien-schneider.pro" rel="preconnect" />
        <Script
          data-exclude-hash="true"
          data-exclude-search="true"
          data-website-id="f4232b19-0136-4892-95b5-05801c29715d"
          src="https://umami.damien-schneider.pro/script.js"
          strategy="lazyOnload"
        />
      </head>
      <body>
        <Suspense fallback={null}>
          <PostHogPageView />
        </Suspense>
        <ThemeProvider>
          <ThemeColorSync />
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
        {env.NODE_ENV === "development" && <RefletDevtools />}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
