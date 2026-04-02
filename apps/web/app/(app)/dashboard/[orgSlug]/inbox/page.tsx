"use client";

import { EyeSlash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { use, useEffect, useRef, useState } from "react";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { H2, Muted } from "@/components/ui/typography";
import {
  AdminConversationView,
  EmptyConversationState,
} from "@/features/inbox/components/admin-conversation-view";
import { ConversationList } from "@/features/inbox/components/conversation-list";
import { InboxCommandPalette } from "@/features/inbox/components/inbox-command-palette";
import {
  type ConversationStatus,
  InboxFilterBar,
} from "@/features/inbox/components/inbox-filter-bar";
import { SettingsPopover } from "@/features/inbox/components/settings-popover";
import { ShortcutHintBar } from "@/features/inbox/components/shortcut-hint-bar";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

interface Member {
  role: string;
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  userId: string;
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
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const membership = useQuery(
    api.organizations.members.getMembership,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const supportSettings = useQuery(
    api.support.conversations.getSupportSettings,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"supportConversations"> | null>(null);
  const [statusFilter, setStatusFilter] = useState<ConversationStatus[]>([
    "open",
    "awaiting_reply",
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const conversations = useQuery(
    api.support.conversations.listForAdmin,
    org?._id
      ? {
          organizationId: org._id,
          status: statusFilter.length > 0 ? statusFilter : undefined,
        }
      : "skip"
  );

  const selectedConversation = useQuery(
    api.support.conversations.get,
    selectedConversationId ? { id: selectedConversationId } : "skip"
  );

  const messages = useQuery(
    api.support.messages.list,
    selectedConversationId ? { conversationId: selectedConversationId } : "skip"
  );

  const members = useQuery(
    api.organizations.members.list,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const sendMessage = useMutation(api.support.messages.send);
  const markAsRead = useMutation(api.support.messages.markAsRead);
  const updateStatus = useMutation(api.support.conversations.updateStatus);
  const assignConversation = useMutation(api.support.conversations.assign);
  const updateSupportSettings = useMutation(
    api.support.conversations.updateSupportSettings
  );

  useEffect(
    function markUnreadMessagesAsRead() {
      if (selectedConversationId && messages && messages.length > 0) {
        const hasUnread = messages.some(
          (m: { isRead: boolean; senderType: string }) =>
            !m.isRead && m.senderType === "user"
        );
        if (hasUnread) {
          markAsRead({ conversationId: selectedConversationId });
        }
      }
    },
    [selectedConversationId, messages, markAsRead]
  );

  useEffect(
    function selectFirstConversation() {
      if (
        conversations &&
        conversations.length > 0 &&
        !selectedConversationId
      ) {
        setSelectedConversationId(conversations[0]._id);
      }
    },
    [conversations, selectedConversationId]
  );

  const isAdmin = membership?.role === "admin" || membership?.role === "owner";

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

  const handleQuickResolve = async (conversationId: string) => {
    await updateStatus({
      id: conversationId as Id<"supportConversations">,
      status: "resolved",
    });
  };

  const handleQuickClose = async (conversationId: string) => {
    await updateStatus({
      id: conversationId as Id<"supportConversations">,
      status: "closed",
    });
  };

  const handleQuickAssign = async (conversationId: string) => {
    const currentUserId = membership?.userId;
    if (!currentUserId) {
      return;
    }
    await assignConversation({
      id: conversationId as Id<"supportConversations">,
      assignedTo: currentUserId,
    });
  };

  const toggleStatusFilter = (status: ConversationStatus) => {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const handleToggleSupport = async (enabled: boolean) => {
    if (!org?._id) {
      return;
    }
    setIsSaving(true);
    try {
      await updateSupportSettings({
        organizationId: org._id,
        supportEnabled: enabled,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const conversationCount = conversations?.length ?? 0;

  const selectConversationByIndex = (index: number) => {
    if (!conversations || conversations.length === 0) {
      return;
    }
    const clamped = Math.max(0, Math.min(index, conversations.length - 1));
    setActiveIndex(clamped);
    setSelectedConversationId(conversations[clamped]._id);
  };

  useKeyboardShortcuts(
    {
      j: () => selectConversationByIndex(activeIndex + 1),
      k: () => selectConversationByIndex(activeIndex - 1),
      e: () => handleStatusChange("resolved"),
      c: () => handleStatusChange("closed"),
      "/": () => searchInputRef.current?.focus(),
      "shift+/": () => setShowHints((prev) => !prev),
      "meta+k": () => setCommandPaletteOpen(true),
    },
    { enabled: isAdmin === true }
  );

  const teamMembers = formatTeamMembers(members);

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

  return (
    <div className="flex h-full flex-col">
      <InboxFilterBar
        onSearchChange={setSearchQuery}
        onToggleStatusFilter={toggleStatusFilter}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
      >
        <SettingsPopover
          isSaving={isSaving}
          onToggle={handleToggleSupport}
          supportEnabled={supportSettings?.supportEnabled ?? false}
        />
      </InboxFilterBar>

      {supportSettings?.supportEnabled === false && (
        <Alert className="mx-4 mt-3 w-auto">
          <EyeSlash className="h-4 w-4" />
          <AlertTitle>
            Your inbox is private &mdash; users can&apos;t see it yet.
          </AlertTitle>
          <AlertAction>
            <Button
              onClick={() => handleToggleSupport(true)}
              size="sm"
              variant="outline"
            >
              Make it public
            </Button>
          </AlertAction>
        </Alert>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 border-r">
          <ConversationList
            activeIndex={activeIndex}
            conversations={conversations ?? []}
            isAdmin={true}
            isLoading={conversations === undefined}
            onQuickAssign={handleQuickAssign}
            onQuickClose={handleQuickClose}
            onQuickResolve={handleQuickResolve}
            onSelect={(conversation) => {
              setSelectedConversationId(
                conversation._id as Id<"supportConversations">
              );
              const index = conversations?.findIndex(
                (c) => c._id === conversation._id
              );
              if (index !== undefined && index >= 0) {
                setActiveIndex(index);
              }
            }}
            searchQuery={searchQuery}
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
            <EmptyConversationState hasConversations={conversationCount > 0} />
          )}
        </div>
      </div>

      <ShortcutHintBar
        hasSelectedConversation={selectedConversationId !== null}
        visible={showHints}
      />

      <InboxCommandPalette
        hasSelectedConversation={selectedConversationId !== null}
        onClose={() => handleStatusChange("closed")}
        onOpenChange={setCommandPaletteOpen}
        onResolve={() => handleStatusChange("resolved")}
        onToggleSupport={() =>
          handleToggleSupport(!supportSettings?.supportEnabled)
        }
        open={commandPaletteOpen}
        supportEnabled={supportSettings?.supportEnabled ?? false}
      />
    </div>
  );
}
