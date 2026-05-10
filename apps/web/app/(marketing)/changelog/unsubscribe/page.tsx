import type { Metadata } from "next";

import { generatePageMetadata } from "@/lib/seo-config";
import UnsubscribePageClient from "./page-client";

export const metadata: Metadata = generatePageMetadata({
  title: "Unsubscribe from Changelog",
  description: "Manage your changelog email subscription preferences.",
  path: "/changelog/unsubscribe",
  noIndex: true,
});

export default function UnsubscribePage() {
  return <UnsubscribePageClient />;
}
