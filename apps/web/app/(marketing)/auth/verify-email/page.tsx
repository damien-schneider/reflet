import type { Metadata } from "next";

import { generatePageMetadata } from "@/lib/seo-config";
import VerifyEmailPageClient from "./page-client";

export const metadata: Metadata = generatePageMetadata({
  title: "Verify Email",
  description: "Verify your Reflet account email address.",
  path: "/auth/verify-email",
  noIndex: true,
});

export default function VerifyEmailPage() {
  return <VerifyEmailPageClient />;
}
