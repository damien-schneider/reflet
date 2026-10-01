import { format, isToday, isYesterday } from "date-fns";

interface GroupableMessage {
  createdAt: number;
  senderId: string;
}

const SAME_BURST_WINDOW_MS = 5 * 60 * 1000;

export function dayLabel(timestamp: number): string {
  if (isToday(timestamp)) {
    return "Today";
  }
  if (isYesterday(timestamp)) {
    return "Yesterday";
  }
  return format(timestamp, "MMMM d, yyyy");
}

export function groupMessagesByDay<TMessage extends GroupableMessage>(
  messages: TMessage[]
): { day: string; messages: TMessage[] }[] {
  const days = new Map<string, TMessage[]>();
  for (const message of messages) {
    const day = format(message.createdAt, "yyyy-MM-dd");
    const dayMessages = days.get(day) ?? [];
    dayMessages.push(message);
    days.set(day, dayMessages);
  }
  return [...days].map(([day, dayMessages]) => ({
    day,
    messages: dayMessages,
  }));
}

export function startsBurst(
  message: GroupableMessage,
  previous: GroupableMessage | undefined
): boolean {
  return (
    previous === undefined ||
    previous.senderId !== message.senderId ||
    message.createdAt - previous.createdAt > SAME_BURST_WINDOW_MS
  );
}
