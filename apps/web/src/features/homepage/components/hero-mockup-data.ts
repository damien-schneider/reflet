export const FEEDBACK_ITEMS = [
  {
    color: "green" as const,
    desc: "Please add a dark theme for late night work sessions.",
    id: "dark-mode",
    label: "Planned",
    tags: [
      { color: "purple" as const, label: "UX" },
      { color: "pink" as const, label: "Design" },
    ],
    title: "Dark mode support",
    votes: 248,
  },
  {
    color: "orange" as const,
    desc: "Would love to see updates directly in our Slack channels.",
    id: "slack-integration",
    label: "In Progress",
    tags: [{ color: "blue" as const, label: "Integration" }],
    title: "Slack Integration",
    votes: 186,
  },
  {
    color: "blue" as const,
    desc: "We want to pull feedback into our internal dashboard.",
    id: "public-api",
    label: "Under Review",
    tags: [
      { color: "blue" as const, label: "API" },
      { color: "gray" as const, label: "Dev" },
    ],
    title: "Public API Access",
    votes: 142,
  },
  {
    color: "green" as const,
    desc: "A native app for iOS and Android would be great.",
    id: "mobile-app",
    label: "Planned",
    tags: [{ color: "orange" as const, label: "Mobile" }],
    title: "Mobile App",
    votes: 98,
  },
  {
    color: "purple" as const,
    desc: "Need to export feedback data for reporting.",
    id: "csv-export",
    label: "Done",
    tags: [{ color: "yellow" as const, label: "Data" }],
    title: "CSV Export",
    votes: 76,
  },
] as const;

// =============================================================================
// Roadmap data
// =============================================================================

export const ROADMAP_COLUMNS = [
  {
    color: "green" as const,
    id: "planned",
    items: [
      { id: "r1", title: "Dark mode support", votes: 248 },
      { id: "r2", title: "Mobile app", votes: 98 },
    ],
    title: "Planned",
  },
  {
    color: "orange" as const,
    id: "in-progress",
    items: [
      { id: "r3", title: "Slack Integration", votes: 186 },
      { id: "r4", title: "Webhook events", votes: 64 },
    ],
    title: "In Progress",
  },
  {
    color: "purple" as const,
    id: "done",
    items: [
      { id: "r5", title: "CSV Export", votes: 76 },
      { id: "r6", title: "Email digest", votes: 52 },
    ],
    title: "Done",
  },
] as const;

// =============================================================================
// Changelog data
// =============================================================================

export const CHANGELOG_ENTRIES = [
  {
    color: "blue" as const,
    date: "Feb 18, 2026",
    id: "c1",
    items: ["REST API with full CRUD", "Webhook events for status changes"],
    title: "Public API & Webhook Support",
    version: "v2.4.0",
  },
  {
    color: "purple" as const,
    date: "Feb 4, 2026",
    id: "c2",
    items: ["Auto-categorize feedback with AI", "Duplicate detection & merge"],
    title: "AI-Powered Triage",
    version: "v2.3.0",
  },
  {
    color: "green" as const,
    date: "Jan 20, 2026",
    id: "c3",
    items: [
      "Drop-in feedback widget for any app",
      "Customizable themes & triggers",
    ],
    title: "Embeddable Widget SDK",
    version: "v2.2.0",
  },
] as const;
