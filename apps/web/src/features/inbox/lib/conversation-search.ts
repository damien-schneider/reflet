interface SearchableConversation {
  lastMessagePreview?: string;
  subject?: string;
  user?: { email: string; name?: string };
}

export function matchesConversationSearch(
  conversation: SearchableConversation,
  query: string
): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return true;
  }

  return [
    conversation.subject,
    conversation.user?.name,
    conversation.user?.email,
    conversation.lastMessagePreview,
  ].some((field) => field?.toLowerCase().includes(trimmed));
}
