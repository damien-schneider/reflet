import type { Metadata } from "next";

import { generatePageMetadata } from "@/lib/seo-config";
import CheckEmailPageClient from "./page-client";

export const metadata: Metadata = generatePageMetadata({
  title: "Check Your Email",
  description: "Confirm your Reflet account email address to finish sign-up.",
  path: "/auth/check-email",
  noIndex: true,
});

export default function CheckEmailPage() {
  return <CheckEmailPageClient />;
}
