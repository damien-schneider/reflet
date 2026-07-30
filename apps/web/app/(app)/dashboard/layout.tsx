import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo-config";
import DashboardLayoutClient from "./layout-client";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Manage your product feedback, roadmap, and changelog. Access your organization's feedback boards, team settings, and analytics.",
  keywords: ["dashboard", "feedback management", "product management"],
  noIndex: true,
  path: "/dashboard",
  title: "Dashboard",
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
