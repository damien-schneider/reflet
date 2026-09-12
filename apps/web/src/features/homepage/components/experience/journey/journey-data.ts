export const JOURNEY_STEPS = [
  {
    chapter: "capture",
    description:
      "Maya has an idea while using your app. She shares it right there, while it’s fresh.",
    id: "capture",
    label: "An idea",
    title: "It starts with a little “what if”.",
  },
  {
    chapter: "board",
    description:
      "Her request lands on your feedback board, where other users can add their voice.",
    id: "board",
    label: "Collect",
    title: "A place for every good idea.",
  },
  {
    chapter: "ai",
    description:
      "AI suggests tags and surfaces related requests. Your team reviews the suggestions and decides what comes next.",
    id: "ai",
    label: "Understand",
    title: "Find the signal together.",
  },
  {
    chapter: "planned",
    description:
      "Move the request into Planned. Now your team and your users can see where it’s headed.",
    id: "planned",
    label: "Plan",
    title: "“What if” becomes “what’s next”.",
  },
  {
    chapter: "planned",
    description:
      "Move it to Done when the work is ready. The original request stays connected to what you built.",
    id: "done",
    label: "Build",
    title: "The idea becomes something real.",
  },
  {
    chapter: "release",
    description:
      "Link the request to your release and publish the changelog. Tell the story behind what changed.",
    id: "release",
    label: "Release",
    title: "Give the good news a home.",
  },
  {
    chapter: "notify",
    description:
      "Notify the people who voted and announce the release in your app. Maya gets to use the feature she asked for.",
    id: "notify",
    label: "Full circle",
    title: "Back to the person who started it.",
  },
] as const;

export type JourneyStep = (typeof JOURNEY_STEPS)[number];

export function journeyAnchorId(step: JourneyStep["id"]) {
  return `journey-${step}`;
}

export const JOURNEY_PROGRESS = JOURNEY_STEPS.map(
  (_, index) => index / (JOURNEY_STEPS.length - 1)
);

export const JOURNEY_CHAPTERS = [
  ...new Set(JOURNEY_STEPS.map((step) => step.chapter)),
];

export const JOURNEY_CHAPTER_OFFSETS = JOURNEY_STEPS.map(
  (step) => `${-JOURNEY_CHAPTERS.indexOf(step.chapter) * 100}%`
);

export function paceJourneyProgress(progress: number) {
  const position =
    Math.max(0, Math.min(1, progress)) * (JOURNEY_STEPS.length - 1);
  const stepIndex = Math.floor(position);
  const transition = Math.max(
    0,
    Math.min(1, (position - stepIndex - 0.18) / 0.64)
  );
  const easedTransition = transition * transition * (3 - 2 * transition);
  return (stepIndex + easedTransition) / (JOURNEY_STEPS.length - 1);
}
