import type { Metadata } from "next";

import { generatePageMetadata } from "@/lib/seo-config";
import ForgotPasswordPageClient from "./page-client";

export const metadata: Metadata = generatePageMetadata({
  title: "Forgot Password",
  description: "Request a secure password reset link for your Reflet account.",
  path: "/auth/forgot-password",
  noIndex: true,
});

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />;
}
