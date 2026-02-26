"use client";

import { use } from "react";
import { AcceptInvitationContent } from "@/features/members/components/accept-invitation-page";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default function InvitePage({ params }: InvitePageProps) {
  const { token } = use(params);

  return <AcceptInvitationContent token={token} />;
}
