"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { use, useEffect, useState } from "react";
import { H1, Lead } from "@/components/ui/typography";
import { authClient } from "@/lib/auth-client";
import { ChatView } from "./components/chat-view";
import { ConversationListView } from "./components/conversation-list-view";
import { LoadingState } from "./components/loading-state";
import { NewConversationView } from "./components/new-conversation-view";
import { SignInRequired } from "./components/sign-in-required";
import { SupportUnavailable } from "./components/support-unavailable";

export default function PublicSupportPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const { data: session } = authClient.useSession();
  const isLoggedIn = Boolean(session?.user);

  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const supportSettings = useQuery(
    api.support_conversations.getSupportSettings,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const conversations = useQuery(
    api.support_conversations.listForUser,
    org?._id && isLoggedIn
      ? { organizationId: org._id as Id<"organizations"> }
      : "skip"
  );

  const [view, setView] = useState<"list" | "chat" | "new">("list");
  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"supportConversations"> | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedConversation = useQuery(
    api.support_conversations.get,
    selectedConversationId ? { id: selectedConversationId } : "skip"
  );

  const messages = useQuery(
    api.support_messages.list,
    selectedConversationId ? { conversationId: selectedConversationId } : "skip"
  );

  const createConversation = useMutation(api.support_conversations.create);
  const sendMessage = useMutation(api.support_messages.send);
  const markAsRead = useMutation(api.support_messages.markAsRead);

  useEffect(() => {
    if (selectedConversationId && messages && messages.length > 0) {
      const hasUnread = messages.some(
        (m: { isRead: boolean; senderType: string }) =>
          !m.isRead && m.senderType === "admin"
      );
      if (hasUnread) {
        markAsRead({ conversationId: selectedConversationId });
      }
    }
  }, [selectedConversationId, messages, markAsRead]);

  if (org === undefined || supportSettings === undefined) {
    return <LoadingState />;
  }

  if (!org) {
    return null;
  }

  if (!supportSettings?.supportEnabled) {
    return <SupportUnavailable orgSlug={orgSlug} />;
  }

  const handleCreateConversation = async () => {
    const trimmedMessage = newMessage.trim();
    if (!(trimmedMessage && org?._id)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const conversationId = await createConversation({
        organizationId: org._id as Id<"organizations">,
        subject: newSubject.trim() || undefined,
        initialMessage: trimmedMessage,
      });
      setNewSubject("");
      setNewMessage("");
      setSelectedConversationId(conversationId);
      setView("chat");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (body: string) => {
    if (!selectedConversationId) {
      return;
    }
    await sendMessage({ conversationId: selectedConversationId, body });
  };

  const handleSelectConversation = (
    conversationId: Id<"supportConversations">
  ) => {
    setSelectedConversationId(conversationId);
    setView("chat");
  };

  const handleStartNewConversation = () => {
    setSelectedConversationId(null);
    setNewSubject("");
    setNewMessage("");
    setView("new");
  };

  const handleBackToList = () => {
    setSelectedConversationId(null);
    setView("list");
  };

  if (!isLoggedIn) {
    return <SignInRequired />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <H1 variant="page">Contact Support</H1>
        <Lead>Get help from our team</Lead>
      </div>

      <div className="mx-auto min-h-[600px] max-w-3xl">
        {view === "new" && (
          <NewConversationView
            hasExistingConversations={
              conversations !== undefined && conversations.length > 0
            }
            isSubmitting={isSubmitting}
            newMessage={newMessage}
            newSubject={newSubject}
            onBack={handleBackToList}
            onMessageChange={setNewMessage}
            onSubjectChange={setNewSubject}
            onSubmit={handleCreateConversation}
          />
        )}

        {view === "chat" && selectedConversation && (
          <ChatView
            conversation={selectedConversation}
            isLoadingMessages={messages === undefined}
            messages={messages ?? []}
            onBack={handleBackToList}
            onNewConversation={handleStartNewConversation}
            onSendMessage={handleSendMessage}
          />
        )}

        {view === "list" && (
          <ConversationListView
            conversations={conversations ?? []}
            onNewConversation={handleStartNewConversation}
            onSelectConversation={handleSelectConversation}
          />
        )}
      </div>
    </div>
  );
}
