"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import type { ConversationSummary } from "@/features/support/components/conversation-list";
import { matchesConversationSearch } from "@/features/support/lib/conversation-search";
import type { ConversationStatus } from "@/features/support/lib/conversation-status";

const DEFAULT_STATUS_FILTER: ConversationStatus[] = ["open", "awaiting_reply"];

interface Member {
  role: string;
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  userId: string;
}

function toTeamMembers(members: Member[] | undefined) {
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

  const [statusFilter, setStatusFilter] = useState(DEFAULT_STATUS_FILTER);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] =
    useState<Id<"supportConversations"> | null>(null);

  const conversations = useQuery(
    api.support.admin.list,
    organizationId
      ? {
          organizationId,
          status: statusFilter.length > 0 ? statusFilter : undefined,
        }
      : "skip"
  );

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

  const visibleConversations: ConversationSummary[] | undefined =
    conversations?.filter((conversation) =>
      matchesConversationSearch(conversation, searchQuery)
    );

  const hasUnreadFromUser = messages?.some(
    (message) => !message.isRead && message.senderType === "user"
  );

  useEffect(() => {
    if (selectedId && hasUnreadFromUser) {
      markAsRead({ conversationId: selectedId });
    }
  }, [selectedId, hasUnreadFromUser, markAsRead]);

  const firstVisibleId = visibleConversations?.[0]?._id;
  const selectionIsVisible = visibleConversations?.some(
    (conversation) => conversation._id === selectedId
  );

  useEffect(() => {
    if (firstVisibleId && !selectionIsVisible) {
      setSelectedId(firstVisibleId);
    }
  }, [firstVisibleId, selectionIsVisible]);

  return {
    conversations: visibleConversations,
    isAdmin: membership
      ? membership.role === "admin" || membership.role === "owner"
      : undefined,
    members: toTeamMembers(members),
    messages,
    org,
    searchQuery,
    selectedConversation,
    selectedId,
    setSearchQuery,
    setSelectedId,
    statusFilter,
    supportEnabled: supportSettings?.supportEnabled,
    toggleStatusFilter: (status: ConversationStatus) =>
      setStatusFilter((prev) =>
        prev.includes(status)
          ? prev.filter((s) => s !== status)
          : [...prev, status]
      ),
    viewerId: membership?.userId,
    write: {
      assignConversation,
      sendMessage,
      updateStatus,
      updateSupportSettings,
    },
  };
}
