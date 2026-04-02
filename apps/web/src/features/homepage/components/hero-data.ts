export const FEEDBACK_ITEMS = [
  {
    id: "dark-mode",
    title: "Dark mode support",
    desc: "Please add a dark theme for late night work sessions.",
    votes: 248,
    color: "green" as const,
    label: "Planned",
    tags: [
      { label: "UX", color: "purple" as const },
      { label: "Design", color: "pink" as const },
    ],
  },
  {
    id: "slack-integration",
    title: "Slack Integration",
    desc: "Would love to see updates directly in our Slack channels.",
    votes: 186,
    color: "orange" as const,
    label: "In Progress",
    tags: [{ label: "Integration", color: "blue" as const }],
  },
  {
    id: "public-api",
    title: "Public API Access",
    desc: "We want to pull feedback into our internal dashboard.",
    votes: 142,
    color: "blue" as const,
    label: "Under Review",
    tags: [
      { label: "API", color: "blue" as const },
      { label: "Dev", color: "gray" as const },
    ],
  },
  {
    id: "mobile-app",
    title: "Mobile App",
    desc: "A native app for iOS and Android would be great.",
    votes: 98,
    color: "green" as const,
    label: "Planned",
    tags: [{ label: "Mobile", color: "orange" as const }],
  },
  {
    id: "csv-export",
    title: "CSV Export",
    desc: "Need to export feedback data for reporting.",
    votes: 76,
    color: "purple" as const,
    label: "Done",
    tags: [{ label: "Data", color: "yellow" as const }],
  },
] as const;

export const ROADMAP_COLUMNS = [
  {
    id: "planned",
    title: "Planned",
    color: "green" as const,
    items: [
      { id: "r1", title: "Dark mode support", votes: 248 },
      { id: "r2", title: "Mobile app", votes: 98 },
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    color: "orange" as const,
    items: [
      { id: "r3", title: "Slack Integration", votes: 186 },
      { id: "r4", title: "Webhook events", votes: 64 },
    ],
  },
  {
    id: "done",
    title: "Done",
    color: "purple" as const,
    items: [
      { id: "r5", title: "CSV Export", votes: 76 },
      { id: "r6", title: "Email digest", votes: 52 },
    ],
  },
] as const;

export const CHANGELOG_ENTRIES = [
  {
    id: "c1",
    version: "v2.4.0",
    date: "Feb 18, 2026",
    title: "Public API & Webhook Support",
    items: ["REST API with full CRUD", "Webhook events for status changes"],
    color: "blue" as const,
  },
  {
    id: "c2",
    version: "v2.3.0",
    date: "Feb 4, 2026",
    title: "AI-Powered Triage",
    items: ["Auto-categorize feedback with AI", "Duplicate detection & merge"],
    color: "purple" as const,
  },
  {
    id: "c3",
    version: "v2.2.0",
    date: "Jan 20, 2026",
    title: "Embeddable Widget SDK",
    items: [
      "Drop-in feedback widget for any app",
      "Customizable themes & triggers",
    ],
    color: "green" as const,
  },
] as const;
