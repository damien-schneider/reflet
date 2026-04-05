// Static data for the landing page product UI mockups

export const FEEDBACK_BOARD_DATA = [
  {
    id: "webhooks",
    title: "Webhook support for status changes",
    author: "Mira Vasquez",
    authorInitial: "MV",
    authorColor: "bg-rose-500",
    votes: 312,
    comments: 18,
    status: "In Progress",
    statusColor: "orange" as const,
    tags: [
      { label: "API", color: "blue" as const },
      { label: "Developer", color: "purple" as const },
    ],
    timeAgo: "4h ago",
    aiConfidence: 91,
    aiPriority: "High",
  },
  {
    id: "sso",
    title: "SAML SSO for enterprise teams",
    author: "Kai Tanaka",
    authorInitial: "KT",
    authorColor: "bg-amber-500",
    votes: 247,
    comments: 23,
    status: "Planned",
    statusColor: "green" as const,
    tags: [
      { label: "Security", color: "red" as const },
      { label: "Enterprise", color: "gray" as const },
    ],
    timeAgo: "1d ago",
    aiConfidence: 87,
    aiPriority: "Critical",
  },
  {
    id: "mobile",
    title: "Push notifications on mobile",
    author: "Jordan Lee",
    authorInitial: "JL",
    authorColor: "bg-emerald-500",
    votes: 189,
    comments: 9,
    status: "Under Review",
    statusColor: "blue" as const,
    tags: [{ label: "Mobile", color: "orange" as const }],
    timeAgo: "3d ago",
    aiConfidence: 78,
    aiPriority: "Medium",
  },
  {
    id: "bulk-actions",
    title: "Bulk merge duplicate feedback",
    author: "Priya Sharma",
    authorInitial: "PS",
    authorColor: "bg-violet-500",
    votes: 156,
    comments: 7,
    status: "Planned",
    statusColor: "green" as const,
    tags: [
      { label: "Productivity", color: "green" as const },
      { label: "AI", color: "purple" as const },
    ],
    timeAgo: "5d ago",
    aiConfidence: 95,
    aiPriority: "High",
  },
  {
    id: "custom-fields",
    title: "Custom metadata fields on feedback",
    author: "Alex Chen",
    authorInitial: "AC",
    authorColor: "bg-sky-500",
    votes: 134,
    comments: 12,
    status: "Done",
    statusColor: "purple" as const,
    tags: [{ label: "Flexible", color: "yellow" as const }],
    timeAgo: "1w ago",
    aiConfidence: 82,
    aiPriority: "Low",
  },
] as const;

export const ROADMAP_COLUMNS_DATA = [
  {
    id: "planned",
    title: "Planned",
    dotColor: "bg-emerald-400",
    items: [
      {
        id: "rp1",
        title: "SAML SSO",
        votes: 247,
        assignees: ["KT", "PS"],
        colors: ["bg-amber-500", "bg-violet-500"],
      },
      {
        id: "rp2",
        title: "Bulk merge duplicates",
        votes: 156,
        assignees: ["AC"],
        colors: ["bg-sky-500"],
      },
      {
        id: "rp3",
        title: "Custom metadata fields",
        votes: 134,
        assignees: ["MV"],
        colors: ["bg-rose-500"],
      },
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    dotColor: "bg-amber-400",
    items: [
      {
        id: "rip1",
        title: "Webhook events",
        votes: 312,
        assignees: ["JL", "AC"],
        colors: ["bg-emerald-500", "bg-sky-500"],
      },
      {
        id: "rip2",
        title: "Mobile push",
        votes: 189,
        assignees: ["KT"],
        colors: ["bg-amber-500"],
      },
    ],
  },
  {
    id: "shipped",
    title: "Shipped",
    dotColor: "bg-violet-400",
    items: [
      {
        id: "rs1",
        title: "GitHub issue sync",
        votes: 403,
        assignees: ["PS", "MV"],
        colors: ["bg-violet-500", "bg-rose-500"],
      },
      {
        id: "rs2",
        title: "AI auto-tagging",
        votes: 278,
        assignees: ["JL"],
        colors: ["bg-emerald-500"],
      },
    ],
  },
] as const;

export const CHANGELOG_ITEMS_DATA = [
  {
    id: "cl1",
    version: "v3.1.0",
    date: "Feb 21, 2026",
    title: "GitHub Release Sync & Webhook Events",
    description:
      "Two-way sync between Reflet changelogs and GitHub Releases. Webhook events fire on every status transition.",
    linkedFeedback: 4,
    tag: "Integration",
    tagColor: "blue" as const,
  },
  {
    id: "cl2",
    version: "v3.0.0",
    date: "Feb 8, 2026",
    title: "AI-Powered Feedback Triage",
    description:
      "Auto-tag, deduplicate, and prioritize incoming feedback. Confidence scores and draft replies powered by your repo context.",
    linkedFeedback: 7,
    tag: "AI",
    tagColor: "purple" as const,
  },
  {
    id: "cl3",
    version: "v2.9.0",
    date: "Jan 24, 2026",
    title: "Embeddable Widget SDK",
    description:
      "Drop-in feedback widget for any web app. Themeable, configurable triggers, and anonymous submissions.",
    linkedFeedback: 3,
    tag: "SDK",
    tagColor: "green" as const,
  },
] as const;

export const METRICS = [
  { value: "7", label: "autonomous AI agents" },
  { value: "5 min", label: "to first Company Brief" },
  { value: "24/7", label: "agents never sleep" },
] as const;

export const LOOP_STEPS = [
  {
    step: 1,
    title: "Connect",
    description:
      "Paste your GitHub repo URL. In 5 minutes, Reflet generates your Company Brief — product definition, ICP, competitive landscape, and roadmap.",
    icon: "link" as const,
  },
  {
    step: 2,
    title: "Discover",
    description:
      "Growth researches Reddit, HN, and competitors. PM reads findings and creates initiatives. The roadmap fills itself.",
    icon: "brain" as const,
  },
  {
    step: 3,
    title: "Build",
    description:
      "CTO writes specs and reviews architecture. Dev creates PRs and ships code. All autonomous.",
    icon: "code" as const,
  },
  {
    step: 4,
    title: "Grow",
    description:
      "Growth announces shipped features. Sales finds and contacts prospects. Support handles users. Revenue tracked via Stripe.",
    icon: "megaphone" as const,
  },
] as const;
