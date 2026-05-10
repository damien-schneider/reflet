import type { Metadata } from "next";

import LabelsPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Labels",
};

export default function LabelsPage() {
  return <LabelsPageClient />;
}
