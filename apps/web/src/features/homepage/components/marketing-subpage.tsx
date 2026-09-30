import Link from "next/link";
import type { ReactNode } from "react";
import { MarketingFooter } from "@/features/homepage/components/experience/marketing-footer";
import {
  MARKETING_MAIN_ID,
  MarketingNavigation,
} from "@/features/homepage/components/experience/marketing-navigation";
import { cn } from "@/lib/utils";
import "@/features/homepage/components/experience/marketing.css";

export function MarketingSubpage({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-page">
      <MarketingNavigation />
      <main id={MARKETING_MAIN_ID} tabIndex={-1}>
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}

interface MarketingPageIntroProps {
  actions?: ReactNode;
  align?: "center" | "start";
  children: ReactNode;
  kicker: string;
  title: ReactNode;
}

export function MarketingPageIntro({
  actions,
  align = "center",
  children,
  kicker,
  title,
}: MarketingPageIntroProps) {
  return (
    <header
      className={cn(
        "marketing-section-intro",
        align === "start" && "marketing-intro-left"
      )}
    >
      <span className="marketing-kicker">{kicker}</span>
      <h1 className="text-balance">{title}</h1>
      <p className="text-pretty">{children}</p>
      {actions ? (
        <div
          className={cn(
            "mt-10 flex flex-wrap items-center gap-x-8 gap-y-4",
            align === "center" && "justify-center"
          )}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}

interface TopicLinkData {
  external?: boolean;
  href: string;
  label: string;
}

export interface MarketingTopic {
  description: string;
  id: string;
  link?: TopicLinkData;
  status?: string;
  title: string;
}

export function MarketingTopicGroup({
  children,
  title,
  topics,
}: {
  children?: ReactNode;
  title: string;
  topics: readonly MarketingTopic[];
}) {
  return (
    <section className="grid gap-8 border-(--marketing-hairline) border-t py-12 md:grid-cols-[1fr_1.6fr] md:gap-16 md:py-16">
      <div>
        <h2 className="text-balance text-heading-2 tracking-[-0.03em] md:text-heading-1">
          {title}
        </h2>
        {children ? (
          <p className="mt-4 max-w-xs text-pretty text-body-lg text-muted-foreground leading-relaxed">
            {children}
          </p>
        ) : null}
      </div>
      <dl className="divide-y divide-(--marketing-hairline)">
        {topics.map((topic) => (
          <div className="py-5 first:pt-0 last:pb-0" key={topic.id}>
            <dt className="flex flex-wrap items-center gap-x-3 gap-y-1 text-heading-4">
              {topic.title}
              {topic.status ? (
                <span className="marketing-status">{topic.status}</span>
              ) : null}
            </dt>
            <dd className="mt-2 max-w-[60ch] text-pretty text-body-lg text-muted-foreground leading-relaxed">
              {topic.description}
              {topic.link ? <TopicLink link={topic.link} /> : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const topicLinkClassName = "marketing-text-link mt-3 flex text-foreground";

function TopicLink({ link }: { link: TopicLinkData }) {
  if (link.external) {
    return (
      <a
        className={topicLinkClassName}
        href={link.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {link.label}
      </a>
    );
  }
  if (!link.href.startsWith("/")) {
    return (
      <a className={topicLinkClassName} href={link.href}>
        {link.label}
      </a>
    );
  }
  return (
    <Link className={topicLinkClassName} href={link.href}>
      {link.label}
    </Link>
  );
}
