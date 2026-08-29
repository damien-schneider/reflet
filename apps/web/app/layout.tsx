import type { Metadata, Viewport } from "next";
import { Fraunces, Schibsted_Grotesk } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { FontSwitcher } from "@/components/dev/font-switcher";
import { PostHogPageView } from "@/components/posthog-pageview";
import { MotionPreferences } from "@/lib/motion-preferences";
import { defaultMetadata, viewport as seoViewport } from "@/lib/seo-config";
import { ThemeProvider } from "@/lib/theme-provider";

import "./globals.css";

const schibstedGrotesk = Schibsted_Grotesk({
  display: "swap",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = defaultMetadata;
export const viewport: Viewport = seoViewport;

const NOSCRIPT_REVEAL =
  '[style*="opacity:0"],[style*="opacity: 0"]{opacity:1!important;transform:none!important}';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      className={`${schibstedGrotesk.className} ${schibstedGrotesk.variable} ${fraunces.variable}`}
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
        <noscript>
          <style>{NOSCRIPT_REVEAL}</style>
        </noscript>
      </head>
      <body>
        <Suspense fallback={null}>
          <PostHogPageView />
        </Suspense>
        <ThemeProvider>
          <MotionPreferences>{children}</MotionPreferences>
        </ThemeProvider>
        <CookieConsentBanner />
        {process.env.NODE_ENV === "development" && <FontSwitcher />}
      </body>
    </html>
  );
}
