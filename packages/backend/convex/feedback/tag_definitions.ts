import type { TagColor } from "./tag_colors";

export const DEFAULT_TAGS = [
  {
    color: "blue",
    description: "New feature suggestions and ideas",
    name: "Feature Request",
    slug: "feature-request",
  },
  {
    color: "red",
    description: "Issues and problems to be fixed",
    name: "Bug Report",
    slug: "bug-report",
  },
  {
    color: "purple",
    description: "Improvements to existing features",
    name: "Enhancement",
    slug: "enhancement",
  },
  {
    color: "yellow",
    description: "Questions and support requests",
    name: "Question",
    slug: "question",
  },
] as const satisfies readonly {
  color: TagColor;
  description: string;
  name: string;
  slug: string;
}[];
