"use client";

import { use } from "react";
import { TeamAccessConsent } from "@/features/team-access/team-access-consent";

interface TeamAccessPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function TeamAccessPage({ searchParams }: TeamAccessPageProps) {
  return <TeamAccessConsent searchParams={use(searchParams)} />;
}
