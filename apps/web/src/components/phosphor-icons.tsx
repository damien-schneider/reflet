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
  ArrowBendDownLeftIcon as ArrowBendDownLeft,
  ArrowRightIcon as ArrowRight,
  ArrowUpIcon as ArrowUp,
  BellRingingIcon as BellRinging,
  BrainIcon as Brain,
  CaretRightIcon as CaretRight,
  ChatCircleDotsIcon as ChatCircleDots,
  CodeIcon as Code,
  GithubLogoIcon as GithubLogo,
  GitMergeIcon as GitMerge,
  ImageSquareIcon as ImageSquare,
  LightningIcon as Lightning,
  PaperPlaneTiltIcon as PaperPlaneTilt,
  SparkleIcon as Sparkle,
  TagIcon as Tag,
  XIcon as X,
} from "@phosphor-icons/react";
