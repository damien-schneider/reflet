import type { Doc } from "@reflet/backend/convex/_generated/dataModel";

type DocumentType = Doc<"autopilotDocuments">["type"];
type DocumentStatus = Doc<"autopilotDocuments">["status"];

export const TYPE_COLOR_MAP: Record<DocumentType, string> = {
  market_research: "blue",
  adr: "blue",
  prospect_brief: "blue",
  codebase_understanding: "blue",
  app_description: "blue",
  target_definition: "blue",
  persona_brief: "blue",
  blog_post: "green",
  changelog: "green",
  linkedin_post: "purple",
  twitter_post: "purple",
  reddit_reply: "purple",
  hn_comment: "purple",
  battlecard: "orange",
  email: "orange",
  support_thread: "red",
  note: "gray",
};

export const STATUS_COLOR_MAP: Record<DocumentStatus, string> = {
  draft: "gray",
  pending_review: "yellow",
  published: "green",
  archived: "red",
};

export const IMPACT_COLOR_MAP: Record<string, string> = {
  high: "red",
  medium: "orange",
  low: "gray",
};

export const TYPE_LABELS: Record<DocumentType, string> = {
  blog_post: "Blog Post",
  market_research: "Market Research",
  note: "Note",
  email: "Email",
  support_thread: "Support Thread",
  battlecard: "Battlecard",
  changelog: "Changelog",
  reddit_reply: "Reddit Reply",
  linkedin_post: "LinkedIn Post",
  twitter_post: "Twitter Post",
  hn_comment: "HN Comment",
  adr: "ADR",
  prospect_brief: "Prospect Brief",
  codebase_understanding: "Codebase Understanding",
  app_description: "App Description",
  target_definition: "Target Definition",
  persona_brief: "Persona Brief",
};

export const DOCUMENT_TYPE_OPTIONS: readonly {
  value: DocumentType;
  label: string;
}[] = [
  { value: "blog_post", label: TYPE_LABELS.blog_post },
  { value: "market_research", label: TYPE_LABELS.market_research },
  { value: "note", label: TYPE_LABELS.note },
  { value: "email", label: TYPE_LABELS.email },
  { value: "support_thread", label: TYPE_LABELS.support_thread },
  { value: "battlecard", label: TYPE_LABELS.battlecard },
  { value: "changelog", label: TYPE_LABELS.changelog },
  { value: "reddit_reply", label: TYPE_LABELS.reddit_reply },
  { value: "linkedin_post", label: TYPE_LABELS.linkedin_post },
  { value: "twitter_post", label: TYPE_LABELS.twitter_post },
  { value: "hn_comment", label: TYPE_LABELS.hn_comment },
  { value: "adr", label: TYPE_LABELS.adr },
  { value: "prospect_brief", label: TYPE_LABELS.prospect_brief },
  {
    value: "codebase_understanding",
    label: TYPE_LABELS.codebase_understanding,
  },
  { value: "app_description", label: TYPE_LABELS.app_description },
  { value: "target_definition", label: TYPE_LABELS.target_definition },
  { value: "persona_brief", label: TYPE_LABELS.persona_brief },
];

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  published: "Published",
  archived: "Archived",
};

export const AGENT_LABELS: Record<string, string> = {
  pm: "PM",
  cto: "CTO",
  dev: "Dev",
  growth: "Growth",
  sales: "Sales",
  support: "Support",
  orchestrator: "Orchestrator",
  system: "System",
  ceo: "CEO",
  validator: "Validator",
};

export const CONTENT_TYPES = new Set<DocumentType>([
  "reddit_reply",
  "hn_comment",
  "linkedin_post",
  "twitter_post",
  "blog_post",
  "changelog",
]);

export const DOCUMENT_REVIEW_TYPE_OPTIONS = DOCUMENT_TYPE_OPTIONS.filter(
  (option) => !CONTENT_TYPES.has(option.value)
);

export const PLATFORM_CONFIG: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  reddit_reply: { icon: "reddit", label: "Reddit", color: "orange" },
  hn_comment: { icon: "hn", label: "Hacker News", color: "orange" },
  linkedin_post: { icon: "linkedin", label: "LinkedIn", color: "blue" },
  twitter_post: { icon: "twitter", label: "X / Twitter", color: "gray" },
  blog_post: { icon: "pencil", label: "Blog", color: "green" },
  changelog: { icon: "pencil", label: "Changelog", color: "green" },
};
