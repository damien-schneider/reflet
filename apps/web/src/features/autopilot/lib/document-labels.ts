import type { Doc } from "@reflet/backend/convex/_generated/dataModel";

type DocumentType = Doc<"autopilotDocuments">["type"];
type DocumentStatus = Doc<"autopilotDocuments">["status"];

export const TYPE_COLOR_MAP: Record<DocumentType, string> = {
  market_research: "blue",
  report: "blue",
  adr: "blue",
  prospect_brief: "blue",
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
  report: "Report",
  adr: "ADR",
  prospect_brief: "Prospect Brief",
};

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
};
