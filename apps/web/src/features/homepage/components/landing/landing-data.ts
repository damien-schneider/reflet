// Static data for the landing page product UI mockups

export const FEEDBACK_BOARD_DATA = [
  {
    aiConfidence: 91,
    aiPriority: "High",
    author: "Mira Vasquez",
    authorColor: "bg-rose-500",
    authorInitial: "MV",
    comments: 18,
    id: "webhooks",
    status: "In Progress",
    statusColor: "orange" as const,
    tags: [
      { color: "blue" as const, label: "API" },
      { color: "purple" as const, label: "Developer" },
    ],
    timeAgo: "4h ago",
    title: "Webhook support for status changes",
    votes: 312,
  },
  {
    aiConfidence: 87,
    aiPriority: "Critical",
    author: "Kai Tanaka",
    authorColor: "bg-amber-500",
    authorInitial: "KT",
    comments: 23,
    id: "sso",
    status: "Planned",
    statusColor: "green" as const,
    tags: [
      { color: "red" as const, label: "Security" },
      { color: "gray" as const, label: "Enterprise" },
    ],
    timeAgo: "1d ago",
    title: "SAML SSO for enterprise teams",
    votes: 247,
  },
  {
    aiConfidence: 78,
    aiPriority: "Medium",
    author: "Jordan Lee",
    authorColor: "bg-emerald-500",
    authorInitial: "JL",
    comments: 9,
    id: "mobile",
    status: "Under Review",
    statusColor: "blue" as const,
    tags: [{ color: "orange" as const, label: "Mobile" }],
    timeAgo: "3d ago",
    title: "Push notifications on mobile",
    votes: 189,
  },
  {
    aiConfidence: 95,
    aiPriority: "High",
    author: "Priya Sharma",
    authorColor: "bg-violet-500",
    authorInitial: "PS",
    comments: 7,
    id: "bulk-actions",
    status: "Planned",
    statusColor: "green" as const,
    tags: [
      { color: "green" as const, label: "Productivity" },
      { color: "purple" as const, label: "AI" },
    ],
    timeAgo: "5d ago",
    title: "Bulk merge duplicate feedback",
    votes: 156,
  },
  {
    aiConfidence: 82,
    aiPriority: "Low",
    author: "Alex Chen",
    authorColor: "bg-sky-500",
    authorInitial: "AC",
    comments: 12,
    id: "custom-fields",
    status: "Done",
    statusColor: "purple" as const,
    tags: [{ color: "yellow" as const, label: "Flexible" }],
    timeAgo: "1w ago",
    title: "Custom metadata fields on feedback",
    votes: 134,
  },
] as const;

export const ROADMAP_COLUMNS_DATA = [
  {
    dotColor: "bg-emerald-400",
    id: "planned",
    items: [
      {
        assignees: ["KT", "PS"],
        colors: ["bg-amber-500", "bg-violet-500"],
        id: "rp1",
        title: "SAML SSO",
        votes: 247,
      },
      {
        assignees: ["AC"],
        colors: ["bg-sky-500"],
        id: "rp2",
        title: "Bulk merge duplicates",
        votes: 156,
      },
      {
        assignees: ["MV"],
        colors: ["bg-rose-500"],
        id: "rp3",
        title: "Custom metadata fields",
        votes: 134,
      },
    ],
    title: "Planned",
  },
  {
    dotColor: "bg-amber-400",
    id: "in-progress",
    items: [
      {
        assignees: ["JL", "AC"],
        colors: ["bg-emerald-500", "bg-sky-500"],
        id: "rip1",
        title: "Webhook events",
        votes: 312,
      },
      {
        assignees: ["KT"],
        colors: ["bg-amber-500"],
        id: "rip2",
        title: "Mobile push",
        votes: 189,
      },
    ],
    title: "In Progress",
  },
  {
    dotColor: "bg-violet-400",
    id: "shipped",
    items: [
      {
        assignees: ["PS", "MV"],
        colors: ["bg-violet-500", "bg-rose-500"],
        id: "rs1",
        title: "GitHub issue sync",
        votes: 403,
      },
      {
        assignees: ["JL"],
        colors: ["bg-emerald-500"],
        id: "rs2",
        title: "AI auto-tagging",
        votes: 278,
      },
    ],
    title: "Shipped",
  },
] as const;

export const CHANGELOG_ITEMS_DATA = [
  {
    date: "Feb 21, 2026",
    description:
      "Two-way sync between Reflet changelogs and GitHub Releases. Webhook events fire on every status transition.",
    id: "cl1",
    linkedFeedback: 4,
    tag: "Integration",
    tagColor: "blue" as const,
    title: "GitHub Release Sync & Webhook Events",
    version: "v3.1.0",
  },
  {
    date: "Feb 8, 2026",
    description:
      "Auto-tag, deduplicate, and prioritize incoming feedback. Confidence scores and draft replies powered by your repo context.",
    id: "cl2",
    linkedFeedback: 7,
    tag: "AI",
    tagColor: "purple" as const,
    title: "AI-Powered Feedback Triage",
    version: "v3.0.0",
  },
  {
    date: "Jan 24, 2026",
    description:
      "Drop-in feedback widget for any web app. Themeable, configurable triggers, and anonymous submissions.",
    id: "cl3",
    linkedFeedback: 3,
    tag: "SDK",
    tagColor: "green" as const,
    title: "Embeddable Widget SDK",
    version: "v2.9.0",
  },
] as const;

export const METRICS = [
  { label: "faster feature prioritization", value: "3.2x" },
  { label: "AI triage accuracy", value: "91%" },
  { label: "fewer duplicate reports", value: "47%" },
] as const;

export const LOOP_STEPS = [
  {
    description:
      "Feedback flows in from your widget, public board, or API — every voice captured in one place.",
    icon: "inbox" as const,
    step: 1,
    title: "Collect",
  },
  {
    description:
      "AI triages, tags, and scores each request. Duplicates merge automatically. Priorities surface.",
    icon: "brain" as const,
    step: 2,
    title: "Understand",
  },
  {
    description:
      "Drag prioritized items onto your roadmap. Sync with GitHub issues. Ship what matters most.",
    icon: "code" as const,
    step: 3,
    title: "Build",
  },
  {
    description:
      "Publish a changelog entry, notify voters automatically, and watch satisfaction climb.",
    icon: "megaphone" as const,
    step: 4,
    title: "Close the loop",
  },
] as const;
