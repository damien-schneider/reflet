import type { ComponentType } from "react";

import HeroBraid from "./layouts/braid";
import HeroConfluence from "./layouts/confluence";
import HeroMosaic from "./layouts/mosaic";
import HeroRelay from "./layouts/relay";
import HeroResolve from "./layouts/resolve";
import HeroSankey from "./layouts/sankey";
import HeroStage from "./layouts/stage";
import type { HeroSlug } from "./proposals";

export const HERO_LAYOUTS: Record<HeroSlug, ComponentType> = {
  braid: HeroBraid,
  confluence: HeroConfluence,
  mosaic: HeroMosaic,
  relay: HeroRelay,
  resolve: HeroResolve,
  sankey: HeroSankey,
  stage: HeroStage,
};
