import Image from "next/image";
import { cn } from "@/lib/utils";

type OrgAvatarSize = "sm" | "lg";

interface OrgAvatarProps {
  className?: string;
  org?: { name: string; logo?: string | null } | null;
  size: OrgAvatarSize;
}

const SIZE_PX: Record<OrgAvatarSize, number> = { lg: 40, sm: 16 };

const BOX_CLASS: Record<OrgAvatarSize, string> = {
  lg: "size-10 rounded-lg font-display text-lg",
  sm: "size-4 rounded font-display font-medium text-caption",
};

const IMAGE_CLASS: Record<OrgAvatarSize, string> = {
  lg: "size-10 rounded-lg",
  sm: "size-4 rounded",
};

export function OrgAvatar({ org, size, className }: OrgAvatarProps) {
  if (org?.logo) {
    return (
      <Image
        alt={org.name}
        className={cn(
          "shrink-0 object-contain outline outline-1 outline-black/10 -outline-offset-1 dark:outline-white/10",
          IMAGE_CLASS[size],
          className
        )}
        height={SIZE_PX[size]}
        src={org.logo}
        width={SIZE_PX[size]}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-secondary text-brand-text",
        BOX_CLASS[size],
        className
      )}
    >
      {org ? org.name.charAt(0).toUpperCase() : null}
    </span>
  );
}
