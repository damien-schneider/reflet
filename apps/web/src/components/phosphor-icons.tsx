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
  BookOpenTextIcon as BookOpenText,
  BrainIcon as Brain,
  CaretRightIcon as CaretRight,
  ChatCircleDotsIcon as ChatCircleDots,
  CodeIcon as Code,
  GithubLogoIcon as GithubLogo,
  GitMergeIcon as GitMerge,
  HeadsetIcon as Headset,
  LightningIcon as Lightning,
  MegaphoneSimpleIcon as MegaphoneSimple,
  RobotIcon as Robot,
  ShieldIcon as Shield,
  SparkleIcon as Sparkle,
  TagIcon as Tag,
  TargetIcon as Target,
  UsersIcon as Users,
  WrenchIcon as Wrench,
} from "@phosphor-icons/react";
