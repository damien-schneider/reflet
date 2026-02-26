"use client";

import { EyeSlash, Gear } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { H2, Muted } from "@/components/ui/typography";
import {
  AdminConversationView,
  EmptyConversationState,
} from "@/features/inbox/components/admin-conversation-view";
import { AdminInboxHeader } from "@/features/inbox/components/admin-inbox-header";
import { ConversationList } from "@/features/inbox/components/conversation-list";

type ConversationStatus = "open" | "awaiting_reply" | "resolved" | "closed";

interface Member {
  role: string;
  userId: string;
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

function formatTeamMembers(members: Member[] | undefined) {
  if (!members) {
    return [];
  }
  return members
    .filter((m) => m.role === "admin" || m.role === "owner")
    .map((m) => ({
      id: m.userId,
      name: m.user?.name ?? undefined,
      email: m.user?.email ?? "",
      image: m.user?.image ?? undefined,
    }));
}

export default function InboxPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const membership = useQuery(
    api.members.getMembership,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const supportSettings = useQuery(
    api.support_conversations.getSupportSettings,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"supportConversations"> | null>(null);
  const [statusFilter, setStatusFilter] = useState<ConversationStatus[]>([
    "open",
    "awaiting_reply",
  ]);

  const conversations = useQuery(
    api.support_conversations.listForAdmin,
    org?._id
      ? {
          organizationId: org._id,
          status: statusFilter.length > 0 ? statusFilter : undefined,
        }
      : "skip"
  );

  const selectedConversation = useQuery(
    api.support_conversations.get,
    selectedConversationId ? { id: selectedConversationId } : "skip"
  );

  const messages = useQuery(
    api.support_messages.list,
    selectedConversationId ? { conversationId: selectedConversationId } : "skip"
  );

  const members = useQuery(
    api.members.list,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const sendMessage = useMutation(api.support_messages.send);
  const markAsRead = useMutation(api.support_messages.markAsRead);
  const updateStatus = useMutation(api.support_conversations.updateStatus);
  const assignConversation = useMutation(api.support_conversations.assign);

  useEffect(() => {
    if (selectedConversationId && messages && messages.length > 0) {
      const hasUnread = messages.some(
        (m: { isRead: boolean; senderType: string }) =>
          !m.isRead && m.senderType === "user"
      );
      if (hasUnread) {
        markAsRead({ conversationId: selectedConversationId });
      }
    }
  }, [selectedConversationId, messages, markAsRead]);

  useEffect(() => {
    if (conversations && conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0]._id);
    }
  }, [conversations, selectedConversationId]);

  const isAdmin = membership?.role === "admin" || membership?.role === "owner";

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Organization not found</H2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </Muted>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Access Denied</H2>
          <Muted className="mt-2">
            You don&apos;t have permission to access the inbox.
          </Muted>
        </div>
      </div>
    );
  }

  const handleSendMessage = async (body: string) => {
    if (!selectedConversationId) {
      return;
    }
    await sendMessage({ conversationId: selectedConversationId, body });
  };

  const handleStatusChange = async (status: ConversationStatus) => {
    if (!selectedConversationId) {
      return;
    }
    await updateStatus({ id: selectedConversationId, status });
  };

  const handleAssign = async (memberId: string | undefined) => {
    if (!selectedConversationId) {
      return;
    }
    await assignConversation({
      id: selectedConversationId,
      assignedTo: memberId,
    });
  };

  const toggleStatusFilter = (status: ConversationStatus) => {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const teamMembers = formatTeamMembers(members);

  return (
    <div className="flex h-full flex-col">
      <AdminInboxHeader
        onToggleStatusFilter={toggleStatusFilter}
        statusFilter={statusFilter}
      >
        <Link href={`/dashboard/${orgSlug}/inbox/settings`}>
          <Button size="sm" variant="outline">
            <Gear className="h-4 w-4" />
            Settings
          </Button>
        </Link>
      </AdminInboxHeader>

      {supportSettings?.supportEnabled === false && (
        <Alert className="mx-4 mt-3 w-auto">
          <EyeSlash className="h-4 w-4" />
          <AlertTitle>
            Your inbox is private &mdash; users can&apos;t see it yet.
          </AlertTitle>
          <AlertAction>
            <Link href={`/dashboard/${orgSlug}/inbox/settings`}>
              <Button size="sm" variant="outline">
                Make it public
              </Button>
            </Link>
          </AlertAction>
        </Alert>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 border-r">
          <ConversationList
            conversations={conversations ?? []}
            isAdmin={true}
            isLoading={conversations === undefined}
            onSelect={(conversation) =>
              setSelectedConversationId(
                conversation._id as Id<"supportConversations">
              )
            }
            selectedId={selectedConversationId ?? undefined}
          />
        </div>

        <div className="flex flex-1 flex-col">
          {selectedConversation ? (
            <AdminConversationView
              conversation={selectedConversation}
              messages={messages ?? []}
              messagesLoading={messages === undefined}
              onAssign={handleAssign}
              onSendMessage={handleSendMessage}
              onStatusChange={handleStatusChange}
              teamMembers={teamMembers}
            />
          ) : (
            <EmptyConversationState
              hasConversations={Boolean(conversations?.length)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
