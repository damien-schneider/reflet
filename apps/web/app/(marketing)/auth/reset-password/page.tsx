import type { Metadata } from "next";

import { generatePageMetadata } from "@/lib/seo-config";
import ResetPasswordPageClient from "./page-client";

export const metadata: Metadata = generatePageMetadata({
  title: "Reset Password",
  description: "Create a new password for your Reflet account.",
  path: "/auth/reset-password",
  noIndex: true,
});

export default function ResetPasswordPage() {
  return <ResetPasswordPageClient />;
}
