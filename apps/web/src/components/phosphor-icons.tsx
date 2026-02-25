"use client";

/**
 * Wraps Phosphor Icons as client components so they can be used
 * as client islands inside React Server Components.
 *
 * @phosphor-icons/react calls createContext at module level,
 * which requires a "use client" boundary.
 *
 * biome-ignore lint/performance/noBarrelFile: intentional re-export for RSC client boundary
 */
export {
  ArrowRight,
  Brain,
  CaretRight,
  ChatCircleDots,
  Code,
  GithubLogo,
  GitMerge,
  Lightning,
  Sparkle,
  Tag,
} from "@phosphor-icons/react";
