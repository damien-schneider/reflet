import { api } from "@reflet/backend/convex/_generated/api";
import { redirect } from "next/navigation";
import { fetchAuthQuery } from "@/lib/auth-server";
import { PendingInvitationsList } from "./pending-invitations-list";

export default async function PendingInvitationsPage() {
  const invitations = await fetchAuthQuery(
    api.organizations.invitations.listMyPendingInvitations
  );

  if (invitations.length === 0) {
    redirect("/dashboard");
  }

  return <PendingInvitationsList />;
}
