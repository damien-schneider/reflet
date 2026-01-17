import {
  BarChart3,
  History,
  Lock,
  Map as MapIcon,
  Users,
  Zap,
} from "lucide-react";

const FEATURES = [
  {
    id: "feedback-management",
    icon: BarChart3,
    title: "Feedback Management",
    description:
      "Collect and organize user feedback with voting, comments, and tags. Prioritize what matters most to your users.",
  },
  {
    id: "roadmap-planning",
    icon: MapIcon,
    title: "Roadmap Planning",
    description:
      "Visualize your product roadmap with a kanban-style board. Drag-and-drop items between stages: Backlog → Planned → In Progress → Done.",
  },
  {
    id: "changelog-releases",
    icon: History,
    title: "Changelog & Releases",
    description:
      "Keep users informed with beautiful release notes. Link updates directly to the features they requested.",
  },
  {
    id: "real-time-collaboration",
    icon: Zap,
    title: "Real-Time Collaboration",
    description:
      "Multiple users can work simultaneously without conflicts. Every change syncs instantly across all connected devices.",
  },
  {
    id: "team-management",
    icon: Users,
    title: "Team Management",
    description:
      "Multi-tenant with organizations, team invitations, and role-based access control.",
  },
] as const;

export default function Features() {
  return (
    <section
      className="relative overflow-hidden bg-background py-24"
      id="features"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 text-left sm:px-6 lg:px-8">
        <div className="mb-4">
          <span className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
            Why Reflect?
          </span>
        </div>

        <h2 className="mb-16 max-w-2xl font-bold text-4xl tracking-tight sm:text-5xl">
          Everything you need to build products users love.
        </h2>

        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard feature={feature} key={feature.id} />
          ))}

          {/* Open Source Promo Card */}
          <OpenSourceCard />
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  feature: (typeof FEATURES)[number];
}

function FeatureCard({ feature }: FeatureCardProps) {
  const Icon = feature.icon;

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground">
        <Icon size={24} />
      </div>
      <h3 className="mb-3 font-medium text-foreground text-xl">
        {feature.title}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {feature.description}
      </p>
    </div>
  );
}

function OpenSourceCard() {
  return (
    <a
      className="flex flex-col justify-between rounded-2xl border border-primary bg-primary p-8 text-primary-foreground shadow-sm transition-shadow hover:shadow-md"
      href="https://github.com/damien-schneider/reflect-os"
      rel="noopener noreferrer"
      target="_blank"
    >
      <div>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/10 text-primary-foreground">
          <Lock size={24} />
        </div>
        <h3 className="mb-3 font-medium text-xl">Open Source</h3>
        <p className="mb-6 text-primary-foreground/70 text-sm leading-relaxed">
          Audit our code, host it yourself, or contribute to the community. Your
          data is yours.
        </p>
      </div>
      <span className="self-start font-medium text-primary-foreground text-sm underline underline-offset-4 hover:text-primary-foreground/80">
        View on GitHub
      </span>
    </a>
  );
}
