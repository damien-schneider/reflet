"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
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

  const [view, setView] = useState<InboxView>("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [chosenId, setSelectedId] = useState<Id<"supportConversations"> | null>(
    null
  );

  const conversations = useQuery(
    api.support.admin.list,
    organizationId ? { organizationId, status: statusesInView(view) } : "skip"
  );

  const visibleConversations = conversations?.filter((conversation) =>
    matchesConversationSearch(conversation, searchQuery)
  );
  const firstVisibleId = visibleConversations?.[0]?._id;
  const chosenIsVisible = visibleConversations?.some(
    (conversation) => conversation._id === chosenId
  );
  const selectedId =
    firstVisibleId && !chosenIsVisible ? firstVisibleId : chosenId;

  const selectedConversation = useQuery(
    api.support.conversations.get,
    selectedId ? { id: selectedId } : "skip"
  );

  const messages = useQuery(
    api.support.messages.list,
    selectedId ? { conversationId: selectedId } : "skip"
  );

  const sendMessage = useMutation(api.support.messages.send);
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
      updateStatus,
      updateSupportSettings,
    },
  };
}
