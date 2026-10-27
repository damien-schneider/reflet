interface NavLink {
  href: string;
  label: string;
}

interface NavGroup {
  label: string;
  links: readonly NavLink[];
}

interface NavSection {
  groups?: readonly NavGroup[];
  links: readonly NavLink[];
  title: string;
}

const DOCS_NAVIGATION: readonly NavSection[] = [
  {
    links: [
      { href: "/docs", label: "Overview" },
      { href: "/docs/using-reflet", label: "Using Reflet" },
    ],
    title: "Start here",
  },
  {
    links: [
      { href: "/docs/sdk", label: "Overview" },
      { href: "/docs/sdk/installation", label: "Installation and identity" },
      { href: "/docs/sdk/client", label: "JavaScript client" },
      { href: "/docs/sdk/react-hooks", label: "React hooks" },
      { href: "/docs/sdk/surveys", label: "Surveys" },
      { href: "/docs/sdk/devtools", label: "Devtools and sessions" },
      { href: "/docs/sdk/desktop-live", label: "Desktop and Live" },
    ],
    title: "SDK",
  },
  {
    links: [
      { href: "/docs/widget", label: "Choose a widget" },
      { href: "/docs/widget/floating-feedback", label: "Feedback collector" },
      { href: "/docs/widget/feedback-widget", label: "Feedback board" },
      { href: "/docs/widget/live-chat", label: "Live chat" },
      { href: "/docs/widget/changelog-widget", label: "Changelog" },
    ],
    title: "Widgets",
  },
  {
    groups: [
      {
        label: "Feedback cards",
        links: [
          {
            href: "/docs/components/feedback-cards/sweep-corner",
            label: "Sweep corner",
          },
          {
            href: "/docs/components/feedback-cards/minimal-notch",
            label: "Minimal notch",
          },
          {
            href: "/docs/components/feedback-cards/editorial-feed",
            label: "Editorial feed",
          },
        ],
      },
      {
        label: "Milestone views",
        links: [
          { href: "/docs/components/milestone-views", label: "Overview" },
          {
            href: "/docs/components/milestone-views/track",
            label: "Horizontal track",
          },
          {
            href: "/docs/components/milestone-views/editorial-accordion",
            label: "Editorial accordion",
          },
          {
            href: "/docs/components/milestone-views/dashboard-timeline",
            label: "Dashboard timeline",
          },
        ],
      },
    ],
    links: [
      { href: "/docs/components", label: "Overview" },
      { href: "/docs/components/installation", label: "Installation" },
      { href: "/docs/components/theming", label: "Theming" },
    ],
    title: "Components",
  },
  {
    links: [
      { href: "/docs/api", label: "REST API and webhooks" },
      { href: "/docs/cli", label: "CLI and agents" },
    ],
    title: "Reference",
  },
];

export type { NavLink };
export { DOCS_NAVIGATION };
