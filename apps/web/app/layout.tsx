import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import { getToken } from "@/lib/auth-server";
import { Providers } from "@/lib/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Reflet",
  description: "Feedback management platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getToken();

  return (
    <html className="dark" lang="en">
      <head>
        <script defer src="//unpkg.com/react-grab/dist/index.global.js" />
      </head>
      <body>
        <Providers initialToken={token}>
          <div className="grid h-svh grid-rows-[auto_1fr]">{children}</div>
          <Toaster richColors />
        </Providers>
      </body>
    </html>
  );
}
