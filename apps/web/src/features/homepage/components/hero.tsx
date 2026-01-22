import { ArrowRight, ArrowUp, CaretRight } from "@phosphor-icons/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { H1, H2, H3, Lead } from "@/components/ui/typography";

export default function Hero() {
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-start px-4 py-12 text-left sm:px-6 sm:py-20 lg:px-8">
      {/* Announcement Pill */}
      <a
        className="group mb-8 inline-flex cursor-pointer items-center gap-2 rounded-full bg-muted/50 px-3 py-1 transition-colors hover:bg-muted"
        href="https://github.com/damien-schneider/reflet"
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className="font-medium text-foreground text-sm">
          Reflet is now Open Source
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="flex items-center font-medium text-muted-foreground text-sm group-hover:text-foreground">
          Star on GitHub <CaretRight className="ml-1" size={14} />
        </span>
      </a>

      {/* Headings */}
      <H1 className="mb-6 w-2/3 text-7xl text-balanced">
        A modern product feedback and roadmap platform.
      </H1>

      <Lead className="mb-10 max-w-2xl">
        Collect feedback, prioritize features, and keep your users in the loop
        with a real-time collaborative board. Changes appear across all devices
        in milliseconds.
      </Lead>

      {/* Buttons */}
      <div className="mb-20 flex flex-col items-center gap-4 sm:flex-row">
        <Link href="/dashboard">
          <Button
            className="w-full rounded-full sm:w-auto"
            size="lg"
            variant="default"
          >
            Start free trial
          </Button>
        </Link>
        <Link
          className="flex w-full items-center justify-center font-medium text-foreground transition-opacity hover:opacity-70 sm:w-auto sm:justify-start"
          href="/dashboard"
        >
          View Demo <ArrowRight className="ml-2" size={18} />
        </Link>
      </div>

      {/* Dashboard Mockup */}
      <DashboardMockup />
    </section>
  );
}

function DashboardMockup() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-muted p-4 shadow-2xl md:p-8">
      <div className="mx-auto flex h-[500px] max-w-[1200px] overflow-hidden rounded-xl border border-border bg-card text-left shadow-lg md:h-[600px]">
        {/* Sidebar */}
        <MockupSidebar />
        {/* List View */}
        <MockupListView />
        {/* Detail View */}
        <MockupDetailView />
      </div>
    </div>
  );
}

function MockupSidebar() {
  return (
    <div className="hidden w-64 flex-col border-border border-r bg-muted/30 md:flex">
      <div className="border-border border-b p-4">
        <div className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-olive-600 font-bold text-[10px] text-olive-100">
              R
            </div>
            <span className="font-semibold text-sm">Reflet App</span>
          </div>
          <CaretRight className="rotate-90 text-muted-foreground" size={14} />
        </div>
      </div>
      <div className="p-4">
        <div className="mb-8 space-y-1">
          <div className="flex cursor-pointer items-center justify-between rounded-lg bg-muted/50 px-3 py-2 font-medium text-foreground text-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-4 w-4 items-center justify-center text-muted-foreground">
                +
              </span>
              <span>Feedback</span>
            </div>
            <span className="rounded border border-border bg-card px-1.5 py-0.5 text-xs">
              12
            </span>
          </div>
          <div className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 font-medium text-muted-foreground text-sm hover:bg-muted">
            <div className="flex items-center gap-3">
              <span className="flex h-4 w-4 items-center justify-center">
                ⊞
              </span>
              <span>Roadmap</span>
            </div>
          </div>
          <div className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 font-medium text-muted-foreground text-sm hover:bg-muted">
            <div className="flex items-center gap-3">
              <span className="flex h-4 w-4 items-center justify-center">
                ◷
              </span>
              <span>Changelog</span>
            </div>
          </div>
          <div className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 font-medium text-muted-foreground text-sm hover:bg-muted">
            <div className="flex items-center gap-3">
              <span className="flex h-4 w-4 items-center justify-center">
                👥
              </span>
              <span>People</span>
            </div>
          </div>
        </div>

        <div className="mb-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
          Funnels
        </div>
        <div className="space-y-1">
          <div className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground text-sm hover:bg-muted">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Planned
          </div>
          <div className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground text-sm hover:bg-muted">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> In Progress
          </div>
          <div className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground text-sm hover:bg-muted">
            <span className="h-2 w-2 rounded-full bg-purple-500" /> Complete
          </div>
        </div>
      </div>
    </div>
  );
}

const FEEDBACK_ITEMS = [
  {
    id: "dark-mode",
    title: "Dark mode support",
    votes: 248,
    status: "Planned",
    active: true,
    desc: "Please add a dark theme for late night work.",
  },
  {
    id: "slack-integration",
    title: "Slack Integration",
    votes: 186,
    status: "In Progress",
    active: false,
    desc: "Would love to see updates directly in Slack.",
  },
  {
    id: "public-api",
    title: "Public API Access",
    votes: 142,
    status: "Under Review",
    active: false,
    desc: "We want to pull feedback into our internal dashboard.",
  },
  {
    id: "mobile-app",
    title: "Mobile App",
    votes: 98,
    status: "Planned",
    active: false,
    desc: "A native app for iOS and Android.",
  },
  {
    id: "sso-saml",
    title: "SSO (SAML)",
    votes: 76,
    status: "Under Review",
    active: false,
    desc: "Enterprise requirement for our team.",
  },
] as const;

function MockupListView() {
  return (
    <div className="hidden w-96 flex-col border-border border-r bg-card lg:flex">
      <div className="flex items-center justify-between border-border border-b bg-muted/30 p-4">
        <H3 className="font-semibold text-foreground">Feature Requests</H3>
        <div className="flex gap-2 text-xs">
          <span className="cursor-pointer font-medium text-foreground">
            Top
          </span>
          <span className="cursor-pointer text-muted-foreground hover:text-foreground">
            New
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-muted/10">
        {FEEDBACK_ITEMS.map((item) => (
          <FeedbackListItem item={item} key={item.id} />
        ))}
      </div>
    </div>
  );
}

interface FeedbackListItemProps {
  item: (typeof FEEDBACK_ITEMS)[number];
}

function FeedbackListItem({ item }: FeedbackListItemProps) {
  const statusClassMap: Record<string, string> = {
    Planned: "border-emerald-100 bg-emerald-50 text-emerald-700",
    "In Progress": "border-blue-100 bg-blue-50 text-blue-700",
  };
  const statusClasses =
    statusClassMap[item.status] ??
    "border-border bg-muted text-muted-foreground";

  return (
    <div
      className={`cursor-pointer border-border border-b p-4 transition-colors hover:bg-card ${item.active ? "border-l-4 border-l-foreground bg-card shadow-sm" : "border-l-4 border-l-transparent"}`}
    >
      <div className="flex gap-4">
        <div className="flex h-12 min-w-[40px] flex-col items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-foreground/20">
          <ArrowUp size={14} />
          <span className="font-bold text-xs">{item.votes}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="mb-1 truncate font-semibold text-foreground text-sm">
            {item.title}
          </h4>
          <p className="mb-2 line-clamp-2 text-muted-foreground text-xs">
            {item.desc}
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 font-medium text-[10px] ${statusClasses}`}
            >
              {item.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockupDetailView() {
  return (
    <div className="flex min-w-0 flex-1 flex-col bg-card">
      <div className="flex items-start justify-between border-border border-b p-6">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 font-medium text-emerald-700 text-xs">
              Planned
            </span>
            <span className="text-muted-foreground text-xs">Oct 24, 2024</span>
          </div>
          <H2 className="mb-2 text-foreground text-xl">Dark mode support</H2>
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-olive-600/20 font-bold text-olive-600 text-xs">
              A
            </div>
            <span className="text-muted-foreground text-xs">
              Suggested by{" "}
              <span className="font-medium text-foreground">Alex Morgan</span>
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            className="flex h-14 w-14 flex-col items-center justify-center rounded-xl"
            size="lg"
            variant="default"
          >
            <ArrowUp size={20} />
            <span className="mt-0.5 font-bold text-xs">249</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto p-6">
        <div className="prose prose-sm max-w-none text-muted-foreground">
          <p>
            It would be great to have a dark mode for the application. Working
            late at night with the bright white background is straining for the
            eyes.
          </p>
          <p>
            Ideally, this should sync with the system preferences but also allow
            a manual override in the settings.
          </p>
        </div>

        <div className="border-border border-t pt-8">
          <h4 className="mb-6 font-semibold text-foreground">Activity</h4>
          <ActivitySection />
        </div>
      </div>

      <div className="border-border border-t bg-muted/30 p-4">
        <div className="relative">
          <input
            className="w-full rounded-lg border border-border bg-card py-3 pr-24 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
            placeholder="Leave a comment..."
            type="text"
          />
          <Button
            className="absolute top-2 right-2 bottom-2"
            size="sm"
            variant="default"
          >
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActivitySection() {
  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-olive-600/10 font-bold text-olive-600 text-xs">
          TM
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold text-foreground text-sm">
              Team Member
            </span>
            <span className="text-muted-foreground text-xs">2h ago</span>
          </div>
          <p className="rounded-lg rounded-tl-none bg-muted p-3 text-muted-foreground text-sm">
            Thanks for the feedback! We've added this to our roadmap for Q4.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              Changed status to
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-[10px] text-emerald-700">
              Planned
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-olive-600/10 font-bold text-olive-600 text-xs">
          S
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold text-foreground text-sm">
              Sarah Tran
            </span>
            <span className="text-muted-foreground text-xs">1h ago</span>
          </div>
          <p className="text-muted-foreground text-sm">
            +1 for system sync! That's a must-have.
          </p>
        </div>
      </div>
    </div>
  );
}
