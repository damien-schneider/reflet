export interface BoardItem {
  ageMinutes: number;
  aiPriority: "Critical" | "High" | "Medium" | "Low";
  author: string;
  authorInitial: string;
  comments: number;
  id: string;
  mine?: boolean;
  shipNote?: string;
  similar?: readonly string[];
  status: "In progress" | "Planned" | "Shipped" | "Under review";
  tags: readonly { label: string }[];
  timeAgo: string;
  title: string;
  version?: string;
  votes: number;
}

export const FEEDBACK_BOARD_DATA = [
  {
    ageMinutes: 180,
    aiPriority: "High",
    author: "@sonia",
    authorInitial: "S",
    comments: 21,
    id: "webhooks",
    shipNote:
      "Every status transition now fires a signed webhook to the endpoint of your choice.",
    similar: [
      "Notify my server when status changes",
      "Any way to subscribe to updates?",
    ],
    status: "In progress",
    tags: [{ label: "API" }, { label: "Developer" }],
    timeAgo: "3h ago",
    title: "Can I get a webhook when status changes?",
    version: "3.1.0",
    votes: 284,
  },
  {
    ageMinutes: 2880,
    aiPriority: "Critical",
    author: "@wferrari",
    authorInitial: "W",
    comments: 46,
    id: "sso",
    shipNote:
      "SAML single sign-on is live, with directory sync for seats and roles.",
    similar: ["Do you support Okta?"],
    status: "Planned",
    tags: [{ label: "Security" }, { label: "Enterprise" }],
    timeAgo: "2d ago",
    title: "We need SSO before we can roll this out",
    version: "3.2.0",
    votes: 96,
  },
  {
    ageMinutes: 30_240,
    aiPriority: "Low",
    author: "@mkc",
    authorInitial: "M",
    comments: 4,
    id: "widget-font",
    shipNote:
      "The widget now inherits your own type stack — no iframe, no override.",
    status: "Shipped",
    tags: [{ label: "Widget" }],
    timeAgo: "3w ago",
    title: "Can the widget use our own font?",
    version: "2.9.4",
    votes: 41,
  },
  {
    ageMinutes: 40,
    aiPriority: "Medium",
    author: "@tomas",
    authorInitial: "T",
    comments: 9,
    id: "dark-board",
    shipNote:
      "The public board follows the visitor's theme, and remembers the choice.",
    similar: [
      "The board burns my eyes at night",
      "Any chance of a dark theme?",
    ],
    status: "Under review",
    tags: [{ label: "Board" }],
    timeAgo: "40m ago",
    title: "Dark mode on the public board",
    version: "3.0.7",
    votes: 12,
  },
] as const satisfies readonly BoardItem[];

export const TRACKED_REQUEST = FEEDBACK_BOARD_DATA[3];

export const STOP_WORDS = new Set([
  "and",
  "can",
  "for",
  "get",
  "have",
  "need",
  "our",
  "please",
  "the",
  "this",
  "want",
  "when",
  "with",
  "you",
  "your",
]);

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
