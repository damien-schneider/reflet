export interface HeroProposal {
  gpu: string;
  layout: string;
  name: string;
  slug: string;
}

export const HERO_PROPOSALS = [
  {
    gpu: "Source streams converging into one channel — deflect them with the cursor, click to send a request in",
    layout:
      "Headline top-left, source labels pinned to each stream, channel runs to the CTA edge",
    name: "Confluence",
    slug: "confluence",
  },
  {
    gpu: "Confluence variant — five duplicate asks woven into one braid; hover to spread the strands apart",
    layout:
      "Oversized type on the baseline, duplicate titles at each strand entry, tally on the right",
    name: "Braid",
    slug: "braid",
  },
  {
    gpu: "Seven noisy ghost lines resolving into one clean roadmap line — hold the click to calm the noise",
    layout:
      "Copy left, the line crosses the whole viewport, version ticks past the resolve point",
    name: "Resolve",
    slug: "resolve",
  },
  {
    gpu: "Fourteen raw asks weave into four ranked bands, sankey-style — thickness is votes; hold the click to calm the noise",
    layout:
      "Copy top-left, vote counts pinned to each band on the right, raw-feedback caption at the baseline",
    name: "Sankey",
    slug: "sankey",
  },
  {
    gpu: "Streams converge behind the board — the real, live one: file a request, watch Reflet merge and rank it",
    layout:
      "Centre stack — copy, CTA, then the interactive board rising from the fold in a browser frame",
    name: "Stage",
    slug: "stage",
  },
  {
    gpu: "One thread relays a request through ask, merge, ship — comets carry it from card to card",
    layout:
      "Three product beats pinned along the thread, copy centred above, captions under each card",
    name: "Relay",
    slug: "relay",
  },
  {
    gpu: "Hundreds of report specks clustered into eight named requests — hold the click and the noise pulls together",
    layout:
      "Editorial copy inside the cloud, cluster labels with votes and report counts around it",
    name: "Mosaic",
    slug: "mosaic",
  },
] as const satisfies readonly HeroProposal[];

export type HeroSlug = (typeof HERO_PROPOSALS)[number]["slug"];

export function isHeroSlug(value: string): value is HeroSlug {
  return HERO_PROPOSALS.some((proposal) => proposal.slug === value);
}
