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
  ArrowRightIcon as ArrowRight,
  BrainIcon as Brain,
  CaretRightIcon as CaretRight,
  ChatCircleDotsIcon as ChatCircleDots,
  CodeIcon as Code,
  GithubLogoIcon as GithubLogo,
  GitMergeIcon as GitMerge,
  LightningIcon as Lightning,
  SparkleIcon as Sparkle,
  TagIcon as Tag,
} from "@phosphor-icons/react";
