"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { matchesConversationSearch } from "@/features/inbox/lib/conversation-search";
import {
  type InboxView,
  statusesInView,
} from "@/features/inbox/lib/inbox-views";

export type InboxConversation = FunctionReturnType<
  typeof api.support.admin.list
>[number];

export interface TeamMember {
  email: string;
  id: string;
  image?: string;
  name?: string;
}

type OrgMembers = FunctionReturnType<typeof api.organizations.members.list>;

function toTeamMembers(members: OrgMembers | undefined): TeamMember[] {
  return (members ?? [])
    .filter((m) => m.role === "admin" || m.role === "owner")
    .map((m) => ({
      email: m.user?.email ?? "",
      id: m.userId,
      image: m.user?.image ?? undefined,
      name: m.user?.name ?? undefined,
    }));
}

export function useInbox(orgSlug: string) {
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const organizationId = org?._id;

  const membership = useQuery(
    api.organizations.members.getMembership,
    organizationId ? { organizationId } : "skip"
  );
  const supportSettings = useQuery(
    api.support.settings.get,
    organizationId ? { organizationId } : "skip"
  );
  const members = useQuery(
    api.organizations.members.list,
    organizationId ? { organizationId } : "skip"
  );

  const linkedId = useSearchParams().get("conversation");
  const [view, setView] = useState<InboxView>("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [chosenId, setSelectedId] = useState<string | null>(linkedId);
  const [lastLinkedId, setLastLinkedId] = useState(linkedId);
  if (linkedId !== lastLinkedId) {
    setLastLinkedId(linkedId);
    if (linkedId) {
      setSelectedId(linkedId);
    }
  }

  const conversations = useQuery(
    api.support.admin.list,
    organizationId ? { organizationId, status: statusesInView(view) } : "skip"
  );
  const outboundStatus = useQuery(
    api.support.email.compose.getOutboundStatus,
    organizationId ? { organizationId } : "skip"
  );

  const visibleConversations = conversations?.filter((conversation) =>
    matchesConversationSearch(conversation, searchQuery)
  );
  const selectedId =
    visibleConversations?.find((conversation) => conversation._id === chosenId)
      ?._id ??
    visibleConversations?.[0]?._id ??
    null;

  const selectedConversation = useQuery(
    api.support.conversations.get,
    selectedId ? { id: selectedId } : "skip"
  );

  const messages = useQuery(
    api.support.messages.list,
    selectedId ? { conversationId: selectedId } : "skip"
  );

  const sendMessage = useMutation(api.support.messages.send);
  const startEmailConversation = useMutation(
    api.support.email.compose.startEmailConversation
  );
  const markAsRead = useMutation(api.support.messages.markAsRead);
  const updateStatus = useMutation(api.support.admin.updateStatus);
  const assignConversation = useMutation(api.support.admin.assign);
  const updateSupportSettings = useMutation(api.support.settings.update);

  const hasUnreadFromUser = messages?.some(
    (message) => !message.isRead && message.senderType === "user"
  );

  useEffect(() => {
    if (selectedId && hasUnreadFromUser) {
      markAsRead({ conversationId: selectedId });
    }
  }, [selectedId, hasUnreadFromUser, markAsRead]);

  return {
    conversations: visibleConversations,
    isAdmin:
      membership === undefined
        ? undefined
        : membership?.role === "admin" || membership?.role === "owner",
    members: toTeamMembers(members),
    messages,
    org,
    outboundStatus,
    searchQuery,
    selectedConversation,
    selectedId,
    setSearchQuery,
    setSelectedId,
    setView,
    supportEnabled: supportSettings?.supportEnabled,
    view,
    viewerId: membership?.userId,
    write: {
      assignConversation,
      sendMessage,
      startEmailConversation,
      updateStatus,
      updateSupportSettings,
    },
  };
}
