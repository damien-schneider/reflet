import {
  ArrowUp,
  ArrowUpRight,
  Bell,
  Check,
  Circle,
  CircleDot,
  Clock3,
  Folder,
  Home,
  LayoutGrid,
  Link2,
  Sparkles,
  Sun,
} from "lucide-react";

export function AppSurface({ shipped }: { shipped: boolean }) {
  return (
    <div className="journey-app-surface">
      <AppSidebar />
      <div className="journey-app-workspace">
        <span className="journey-greeting">
          Good morning, Maya <Sun aria-hidden="true" size={13} />
        </span>
        <h4>
          A little space
          <br />
          for your best work.
        </h4>
        <div className="journey-app-tabs">
          <span>My projects</span>
          <span>Recently opened</span>
        </div>
        <div className="journey-fake-project">
          <span>
            <LayoutGrid aria-hidden="true" size={20} />
          </span>
          <strong>Website refresh</strong>
          <small>Design · In progress</small>
          <div className="journey-fake-progress">
            <span />
          </div>
        </div>
        <div className="journey-fake-project">
          <span>
            <Folder aria-hidden="true" size={20} />
          </span>
          <strong>Spring launch</strong>
          <small>Product · Planning</small>
          <div className="journey-fake-progress">
            <span />
          </div>
        </div>
      </div>
      {shipped && (
        <div className="journey-app-notification">
          <Bell aria-hidden="true" size={12} /> Your feedback made this happen.
        </div>
      )}
    </div>
  );
}

const BOARD_COLUMNS = [
  {
    category: "Productivity",
    icon: Circle,
    id: "board",
    name: "To do",
    title: "Keyboard shortcuts",
    votes: 8,
  },
  {
    category: "Workspace",
    icon: Clock3,
    id: "planned",
    name: "Planned",
    title: "Custom fields",
    votes: 6,
  },
  {
    category: "Improvement",
    icon: Check,
    id: "done",
    name: "Done",
    title: "Faster search",
    votes: 9,
  },
];

export function BoardSurface({ step }: { step: string }) {
  return (
    <div className="journey-board-surface">
      <div className="journey-board-title">
        <strong>Product roadmap</strong>
        <span>
          Public board <ArrowUpRight aria-hidden="true" size={12} />
        </span>
      </div>
      <div className="journey-board-columns">
        {BOARD_COLUMNS.map((column) => (
          <div
            className="journey-board-column"
            data-current={step === column.id}
            key={column.id}
          >
            <div>
              <column.icon aria-hidden="true" size={13} />
              <strong>{column.name}</strong>
              <small>{step === column.id ? "2" : "1"}</small>
            </div>
            <div className="journey-board-note">
              <span>{column.category}</span>
              <strong>{column.title}</strong>
              <small>
                <ArrowUp aria-hidden="true" size={10} /> {column.votes}
              </small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TriageSurface() {
  return (
    <div className="journey-triage-surface">
      <div className="journey-triage-orbit" />
      <span className="journey-ai-label">
        <Sparkles aria-hidden="true" size={16} /> A little help from AI
      </span>
      <div className="journey-ai-suggestion journey-ai-related">
        <span>
          <Link2 aria-hidden="true" size={13} /> Related requests
        </span>
        <strong>Remember my filters</strong>
        <strong>Personal dashboard views</strong>
        <small>Review together</small>
      </div>
      <div className="journey-ai-suggestion journey-ai-category">
        <span>Suggested tags</span>
        <strong>
          <Sparkles aria-hidden="true" size={12} /> Feature request
        </strong>
        <strong>Workspace</strong>
        <small>Your team makes the call</small>
      </div>
    </div>
  );
}

export function ReleaseSurface() {
  return (
    <div className="journey-release-surface">
      <div>
        <span className="marketing-kicker">What’s new in Orbit</span>
        <h4>
          Little improvements.
          <br />
          Better every day.
        </h4>
      </div>
      <span className="journey-release-date">LATEST RELEASE</span>
      <span className="journey-published">
        <Check aria-hidden="true" size={12} /> Published to your changelog
      </span>
    </div>
  );
}

function AppSidebar() {
  return (
    <aside>
      <strong>
        <CircleDot aria-hidden="true" className="orbit-logo" size={21} /> orbit
      </strong>
      <span>
        <Home aria-hidden="true" size={13} /> Overview
      </span>
      <span>
        <Folder aria-hidden="true" size={13} /> Projects
      </span>
      <span>
        <Clock3 aria-hidden="true" size={13} /> Activity
      </span>
      <span>
        <LayoutGrid aria-hidden="true" size={13} /> Saved views
      </span>
      <small>Your everyday workspace</small>
    </aside>
  );
}
