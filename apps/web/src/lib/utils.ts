import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "micro",
            "caption",
            "label",
            "body",
            "body-lg",
            "heading-1",
            "heading-2",
            "heading-3",
            "heading-4",
            "display",
          ],
        },
      ],
    },
  },
  override: {
    conflictingClassGroups: {
      "font-size": [],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
