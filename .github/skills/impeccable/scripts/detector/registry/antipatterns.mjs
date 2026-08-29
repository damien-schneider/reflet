const ANTIPATTERNS = [
  // ── AI slop: tells that something was AI-generated ──
  {
    category: "slop",
    description:
      "Thick colored border on one side of a card — the most recognizable tell of AI-generated UIs. Use a subtler accent or remove it entirely.",
    id: "side-tab",
    name: "Side-tab accent border",
    skillGuideline: "colored accent stripe",
    skillSection: "Visual Details",
  },
  {
    category: "slop",
    description:
      "Thick accent border on a rounded card — the border clashes with the rounded corners. Remove the border or the border-radius.",
    id: "border-accent-on-rounded",
    name: "Border accent on rounded element",
    skillGuideline: "colored accent stripe",
    skillSection: "Visual Details",
  },
  {
    category: "slop",
    description:
      "Inter, Roboto, Fraunces, Geist, Plus Jakarta Sans, and Space Grotesk are used on so many sites they no longer feel distinctive. Each new wave of AI-generated UIs converges on the same handful of faces. Choose a face that gives your interface personality.",
    id: "overused-font",
    name: "Overused font",
    scopes: ["type"],
    skillGuideline: "overused fonts like Inter",
    skillSection: "Typography",
  },
  {
    category: "slop",
    description:
      "Font sizes are too close together — no clear visual hierarchy. Use fewer sizes with more contrast (aim for at least a 1.25 ratio between steps).",
    id: "flat-type-hierarchy",
    name: "Flat type hierarchy",
    scopes: ["type"],
    skillGuideline: "flat type hierarchy",
    skillSection: "Typography",
  },
  {
    category: "slop",
    description:
      "Gradient text is decorative rather than meaningful — a common AI tell, especially on headings and metrics. Use solid colors for text.",
    id: "gradient-text",
    name: "Gradient text",
    skillGuideline: "gradient text for",
    skillSection: "Color & Contrast",
  },
  {
    category: "slop",
    description:
      "Purple/violet gradients and cyan-on-dark are the most recognizable tells of AI-generated UIs. Choose a distinctive, intentional palette.",
    id: "ai-color-palette",
    name: "AI color palette",
    skillGuideline: "AI color palette",
    skillSection: "Color & Contrast",
  },
  {
    category: "slop",
    description:
      'A warm cream or beige page background has become the default "tasteful" AI surface, reached for by reflex. Choose a background that comes from a deliberate palette, not the safe warm off-white.',
    id: "cream-palette",
    name: "Cream / beige palette",
    skillGuideline: "cream and beige as the default surface",
    skillSection: "Color & Contrast",
  },
  {
    category: "slop",
    description:
      "Cards inside cards create visual noise and excessive depth. Flatten the hierarchy — use spacing, typography, and dividers instead of nesting containers.",
    id: "nested-cards",
    name: "Nested cards",
    scopes: ["layout"],
    skillGuideline: "Nest cards inside cards",
    skillSection: "Layout & Space",
  },
  {
    category: "slop",
    description:
      "The same spacing value used everywhere — no rhythm, no variation. Use tight groupings for related items and generous separations between sections.",
    id: "monotonous-spacing",
    name: "Monotonous spacing",
    scopes: ["layout"],
    skillGuideline: "same spacing everywhere",
    skillSection: "Layout & Space",
  },
  {
    category: "slop",
    description:
      "Bounce and elastic easing feel dated and tacky. Real objects decelerate smoothly — use exponential easing (ease-out-quart/quint/expo) instead.",
    id: "bounce-easing",
    name: "Bounce or elastic easing",
    skillGuideline: "bounce or elastic easing",
    skillSection: "Motion",
  },
  {
    category: "slop",
    description:
      "Small pulsing status dots simulate liveness decoratively. Reserve pulse animation for indicators tied to genuinely live, changing data; a static indicator with clear labeling is honest and calmer.",
    id: "pulsing-dot",
    name: "Pulsing status dot",
    skillGuideline: "decorative pulsing status dot",
    skillSection: "Motion",
  },
  {
    category: "slop",
    description:
      "A blinking text cursor animated into a hero or landing section simulates typing where no input exists. It borrows the dev-tool aesthetic as decoration. Real editable fields draw their own caret; anywhere else, let the composition hold attention without a fake prompt.",
    id: "blinking-cursor",
    name: "Decorative blinking cursor",
    severity: "advisory",
    skillSection: "Motion",
  },
  {
    category: "slop",
    description:
      "A large inline SVG that builds a pictorial scene from a pile of primitive shapes reads as placeholder clip art, not illustration. Icons, logos, and data graphics are fine at their scale; a hero-sized visual deserves real artwork, a photograph, or a deliberately drawn graphic.",
    id: "shape-assembled-illustration",
    name: "Shape-assembled illustration",
    severity: "advisory",
    skillSection: "Imagery",
  },
  {
    category: "slop",
    description:
      'Colored glow shadows — a zero-offset chromatic halo (box- or text-shadow) on any background, or any colored blurred shadow on a dark background — are the default "cool" look of AI-generated UIs. Use neutral elevation shadows and subtle, purposeful lighting instead.',
    id: "dark-glow",
    name: "Glowing shadow accents",
    skillGuideline: "dark mode with glowing accents",
    skillSection: "Color & Contrast",
  },
  {
    category: "slop",
    description:
      "A chromatic radial-gradient wash — saturated at the center, fading to transparent — used as a decorative background glow on a dark page. Same tell as glowing shadows, drawn with a gradient instead of a shadow. Ground the surface with a solid or subtly shifted background instead.",
    id: "radial-halo",
    name: "Radial-gradient background halo",
    skillGuideline: "dark mode with glowing accents",
    skillSection: "Color & Contrast",
  },
  {
    category: "slop",
    description:
      'A soft, low-opacity accent-colored radial gradient fading to transparent, dropped behind a hero or section as a "spotlight." It is a reflex AI decoration — the translucent cousin of the saturated radial halo. Let the surface stand on its own, or light the composition with a deliberate material accent rather than a floating colored haze.',
    id: "radial-spotlight-glow",
    name: "Decorative radial spotlight glow",
    skillGuideline: "dark mode with glowing accents",
    skillSection: "Color & Contrast",
  },
  {
    category: "slop",
    description:
      "Continuously auto-scrolling content demands attention it has not earned and hides half its content at any moment. Reserve motion for content that changes; let readers move at their own pace.",
    id: "marquee",
    name: "Auto-scrolling marquee",
    skillGuideline: "auto-scrolling marquee",
    skillSection: "Motion",
  },
  {
    category: "slop",
    description:
      "A small rounded-square icon container above a heading is the universal AI feature-card template — every generator outputs this exact shape. Try a side-by-side icon and heading, or let the icon sit in flow without its own container.",
    id: "icon-tile-stack",
    name: "Icon tile stacked above heading",
    scopes: ["layout"],
    skillGuideline: "large icons with rounded corners above every heading",
    skillSection: "Typography",
  },
  {
    category: "slop",
    description:
      "Oversized italic serif (Fraunces, Recoleta, Playfair, Newsreader-italic) as the primary hero headline reads as taste in isolation but has become the universal AI-startup landing page hero. Set roman, or move to a non-serif display face. Editorial / magazine register may legitimately want this — judge by context.",
    id: "italic-serif-display",
    name: "Italic serif display headline",
    scopes: ["type"],
    skillGuideline: "oversized italic serif as the hero headline",
    skillSection: "Typography",
  },
  {
    category: "slop",
    description:
      "A tiny uppercase letter-spaced label sitting immediately above an oversized hero headline — or the same shape rendered as a pill chip — is now the default AI SaaS hero. Drop the eyebrow, integrate the kicker into the headline, or run it as a navigation breadcrumb instead.",
    id: "hero-eyebrow-chip",
    name: "Hero eyebrow / pill chip",
    scopes: ["type"],
    skillGuideline: "tiny uppercase tracked label above the hero headline",
    skillSection: "Typography",
  },
  {
    category: "slop",
    description:
      "A tiny tracked uppercase or small-caps label sitting as its own block directly above a heading is banned outright, repeated or not. Generated kickers never earn their place: the heading carries its own weight. Delete the label and let the heading speak; if the words matter, work them into the heading or the body.",
    id: "kicker-above-heading",
    name: "Kicker / eyebrow label above heading",
    scopes: ["type"],
    skillGuideline: "kicker or eyebrow labels above headings",
    skillSection: "Typography",
  },
  {
    category: "slop",
    description:
      "Small numeric index labels riding next to section headings, repeated section after section, are AI editorial scaffolding — a page numbering its own chapters instead of earning structure. Let hierarchy, content, and rhythm carry the sequence.",
    id: "numbered-section-labels",
    name: "Tiny numbered section labels",
    scopes: ["type"],
    severity: "advisory",
    skillGuideline: "numbered section markers",
    skillSection: "Layout & Space",
  },
  {
    // Advisory: humans use em-dashes legitimately, so this rule is opt-in noise
    // rather than a failure. It fires only on the AI saturation pattern, not on
    // ordinary prose. Advisory findings are surfaced separately, never counted
    // as failures, and skipped by the design hook unless a project opts in.
    advisory: true,
    category: "slop",
    description:
      "Em-dash saturation in body copy is an AI cadence tell. Advisory only: humans use em-dashes legitimately, so this fires only on saturation — at least 8 em-dashes (— or --) at a density near one per 500 characters of body text — never on a long article that uses a few. Prefer commas, colons, periods, or parentheses.",
    id: "em-dash-overuse",
    name: "Em-dash overuse",
    skillGuideline: "no em dashes",
    skillSection: "Copy",
  },
  {
    category: "slop",
    description:
      "Generic SaaS phrases (streamline / empower / supercharge / world-class / enterprise-grade / next-generation / cutting-edge / etc) are instant AI tells. Pick a specific verb and noun that says what the product literally does.",
    id: "marketing-buzzword",
    name: "Marketing buzzword",
    skillGuideline: "marketing buzzwords",
    skillSection: "Copy",
  },
  {
    category: "slop",
    description:
      'Three or more sections landing on a short rebuttal sentence ("X. No Y." / "X. Just Y.") or a manufactured-contrast aphorism ("Not a feature. A platform.") reads as AI cadence, not voice. Once is fine; the pattern is the tell.',
    id: "aphoristic-cadence",
    name: "Aphoristic-cadence copy",
    skillGuideline: "aphoristic cadence",
    skillSection: "Copy",
  },
  {
    category: "slop",
    description:
      "A full-sentence headline set at display size ends up dominating the viewport, leaving no room for anything else above the fold. A punchy one- or two-word headline at that size is fine — the problem is a long headline blown up too large. Set long headlines smaller, or tighten the copy.",
    id: "oversized-h1",
    name: "Oversized hero headline",
    scopes: ["type"],
    skillGuideline: "long headline set at display size",
    skillSection: "Typography",
  },
  {
    category: "slop",
    description:
      "Letter-spacing pulled tighter than the point where characters keep their own shapes costs legibility. Tighten display type optically, not destructively.",
    id: "extreme-negative-tracking",
    name: "Crushed letter spacing",
    scopes: ["type"],
    skillGuideline: "letter spacing crushed past legibility",
    skillSection: "Typography",
  },
  {
    category: "quality",
    description:
      "<img> tags with empty src, missing src, or placeholder values ship as broken-image boxes. Use real images, generated assets, or remove the tag.",
    id: "broken-image",
    name: "Broken or placeholder image",
    skillGuideline: "broken image references",
    skillSection: "Imagery",
  },

  // ── Quality: general design and accessibility issues ──
  {
    category: "quality",
    description:
      "A script threw an uncaught exception or failed to parse while the page loaded. Broken JavaScript silently kills reveals, interactions, and dynamic content, and can leave most of a page invisible. Fix the error before judging anything else.",
    id: "script-error",
    name: "Uncaught script error on load",
    severity: "error",
  },
  {
    category: "quality",
    description:
      "A large share of the page text sits at opacity 0 or visibility hidden even after every reveal handler had a chance to run. This is the failed-reveal signature: the content shipped but never becomes visible. Make content visible by default and let JavaScript enhance its entrance instead of gating its existence.",
    id: "content-hidden-at-rest",
    name: "Content invisible at rest",
    scopes: ["layout"],
    severity: "error",
  },
  {
    category: "quality",
    description:
      "Cards inside a horizontal scroller or tab panel sit flush against the container edge at rest while keeping a gutter on the other side, so their edges and rounded corners get cut off. Usually the panel is sized wider than its clip box. Keep a consistent inset on both sides.",
    id: "edge-flush-cards",
    name: "Cards flush against the scroller edge",
    scopes: ["layout"],
  },
  {
    category: "quality",
    description:
      "Text is painted under an opaque element or a second text run, so part of it cannot be read. A decorative box, a stacked layer, or an inline element with leaked padding lands on the words instead of beside them. Give overlapping layers room, or move the text out from under the layer above it.",
    id: "text-occlusion",
    name: "Text occluded by an overlapping element",
    scopes: ["layout"],
    skillSection: "Layout & Space",
  },
  {
    category: "quality",
    description:
      "A multi-column opening section lets one column run far past the fold while its sibling fits in a single viewport, so the short column floats in dead space and the fold falls deep inside one section. Balance the columns, cap the tall one, or let the long content flow below the opening row.",
    id: "first-viewport-column-overflow",
    name: "One column stretches the first viewport",
    scopes: ["layout"],
    skillSection: "Layout & Space",
  },
  {
    category: "quality",
    description:
      "Gray text looks washed out on colored backgrounds. Use a darker shade of the background color instead, or white/near-white for contrast.",
    id: "gray-on-color",
    name: "Gray text on colored background",
    skillGuideline: "gray text on colored backgrounds",
    skillSection: "Color & Contrast",
  },
  {
    category: "quality",
    description:
      "Text does not meet WCAG AA contrast requirements (4.5:1 for body, 3:1 for large text). Increase the contrast between text and background.",
    id: "low-contrast",
    name: "Low contrast text",
  },
  {
    category: "quality",
    description:
      "Animating width, height, padding, or margin causes layout thrash and janky performance. Use transform and opacity instead, or grid-template-rows for height animations.",
    id: "layout-transition",
    name: "Layout property animation",
    skillGuideline: "Animate layout properties",
    skillSection: "Motion",
  },
  {
    category: "quality",
    description:
      "Text lines wider than ~80 characters are hard to read. The eye loses its place tracking back to the start of the next line. Add a max-width (65ch to 75ch) to text containers.",
    id: "line-length",
    name: "Line length too long",
    scopes: ["type", "layout"],
    skillGuideline: "wrap beyond ~80 characters",
    skillSection: "Layout & Space",
  },
  {
    category: "quality",
    description:
      "Text is too close to the edge of its container. Two shapes: (1) an element with its own text where the padding is too low for the font size, and (2) a wrapper with text-bearing children and near-zero padding against a visible boundary (border, outline, or non-transparent background) — children land flush against the boundary line. Add at least 8px (ideally 12–16px) of padding inside bordered, outlined, or colored containers.",
    id: "cramped-padding",
    name: "Cramped padding",
    scopes: ["layout"],
    skillGuideline: "inside bordered or colored containers",
    skillSection: "Layout & Space",
  },
  {
    category: "quality",
    description:
      "Body paragraphs render flush against the left or right viewport edge with no container providing horizontal padding. Wrap content in a container with at least 16px (ideally 24-32px) of horizontal padding, or apply max-width with mx-auto.",
    id: "body-text-viewport-edge",
    name: "Body text touching viewport edge",
    scopes: ["layout"],
  },
  {
    category: "quality",
    description:
      "Line height below 1.3x the font size makes multi-line text hard to read. Use 1.5 to 1.7 for body text so lines have room to breathe.",
    id: "tight-leading",
    name: "Tight line height",
    scopes: ["type"],
  },
  {
    category: "quality",
    description:
      "Heading levels should not skip (e.g. h1 then h3 with no h2). Screen readers use heading hierarchy for navigation. Skipping levels breaks the document outline.",
    id: "skipped-heading",
    name: "Skipped heading level",
    scopes: ["type"],
  },
  {
    category: "quality",
    description:
      "A heading binds to the content it introduces, so the rendered space above it should exceed the space below it. When headings across a page sit as close or closer to the block above than to their own content, every section reads as if it captions the previous one. Open up the space above each heading.",
    id: "heading-rhythm",
    name: "Heading crowded against the previous block",
    scopes: ["layout", "type"],
    skillSection: "Layout & Space",
  },
  {
    category: "quality",
    description:
      'Justified text without hyphenation creates uneven word spacing ("rivers of white"). Use text-align: left for body text, or enable hyphens: auto if you must justify.',
    id: "justified-text",
    name: "Justified text",
    scopes: ["type"],
  },
  {
    category: "quality",
    description:
      "Body text below 12px is hard to read, especially on high-DPI screens. Use at least 14px for body content, 16px is ideal.",
    id: "tiny-text",
    name: "Tiny body text",
    scopes: ["type"],
  },
  {
    category: "quality",
    description:
      "Interactive and content-bearing UI text (links, buttons, nav items, labels, table cells, meta rows, timecodes) below 11px is a legibility failure, not a style choice. WCAG sets no absolute pixel floor, but functional text under 11px is a defensible quality bar: it fails on high-DPI and small viewports and it degrades tap and read targets. The 11px floor holds even inside a footer; only non-interactive legal smallprint gets the softer 10px floor. Being ON the DESIGN.md size ramp does not exempt a value here: adding 8px to the ramp launders the token but not the legibility problem, and that is exactly the escape hatch this rule closes. Exempts sup/sub, visually-hidden (sr-only) text, and code/terminal contexts. Decorative letterspaced micro-labels are still functional and stay in scope.",
    id: "undersized-ui-text",
    name: "Undersized functional text",
    scopes: ["type"],
  },
  {
    category: "quality",
    description:
      "Long passages in uppercase are hard to read. We recognize words by shape (ascenders and descenders), which all-caps removes. Reserve uppercase for short labels and headings.",
    id: "all-caps-body",
    name: "All-caps body text",
    scopes: ["type"],
    skillGuideline: "long body passages in uppercase",
    skillSection: "Typography",
  },
  {
    category: "quality",
    description:
      "Letter spacing above 0.05em on body text disrupts natural character groupings and slows reading. Reserve wide tracking for short uppercase labels only.",
    id: "wide-tracking",
    name: "Wide letter spacing on body text",
    scopes: ["type"],
  },
  {
    category: "quality",
    description:
      "Content renders wider than its container, spilling out or forcing a horizontal scrollbar. Let text wrap, constrain widths, or give the region a deliberate scroll affordance.",
    id: "text-overflow",
    name: "Content overflowing its container",
    scopes: ["layout"],
    skillGuideline: "content wider than its container",
    skillSection: "Layout & Space",
  },
  {
    category: "quality",
    description:
      "The same literal text rendered three or more times in structurally different spots inside a single card or panel is redundant messaging — usually a status or label wired into every slot of a template. Say it once, in the slot where it matters most.",
    id: "repeated-container-text",
    name: "Same text repeated inside one container",
  },
  {
    category: "quality",
    description:
      "A clipping container (overflow hidden or clip) wrapping an absolutely-positioned child cuts off tooltips, menus, and popovers that need to escape. Let the overflow be visible, or move the positioned layer out of the clip.",
    id: "clipped-overflow-container",
    name: "Positioned child clipped by overflow container",
    scopes: ["layout"],
    skillGuideline: "overflow container clipping positioned children",
    skillSection: "Layout & Space",
  },
  {
    category: "quality",
    description:
      "A font is used that is not declared in DESIGN.md typography. Use the documented type system or update DESIGN.md if this is an intentional brand addition.",
    id: "design-system-font",
    name: "Font outside DESIGN.md",
    scopes: ["type"],
    skillGuideline: "font family outside the project design system",
    skillSection: "Typography",
  },
  {
    category: "quality",
    description:
      "A literal color is outside the DESIGN.md palette and sidecar tonal ramps. This may be legitimate, but it should be an intentional design-system addition rather than drift.",
    id: "design-system-color",
    name: "Color outside DESIGN.md",
    severity: "advisory",
    skillGuideline: "literal color outside the project design system",
    skillSection: "Color & Contrast",
  },
  {
    category: "quality",
    description:
      "A border-radius value is outside the DESIGN.md rounded scale. Use a documented radius token or update the design system if the new shape is intentional.",
    id: "design-system-radius",
    name: "Radius outside DESIGN.md",
    severity: "advisory",
    skillGuideline: "border radius outside the project design system",
    skillSection: "Visual Details",
  },
  {
    category: "quality",
    description:
      "A literal font-size is off the type ramp documented in DESIGN.md typography. Use a documented size step or update the design system if the new step is intentional.",
    id: "design-system-font-size",
    name: "Font size outside DESIGN.md",
    scopes: ["type"],
    severity: "advisory",
    skillGuideline: "font size outside the project design system",
    skillSection: "Typography",
  },

  // ── Common generated-UI tells ───────────────────────────────────────────
  {
    category: "slop",
    description:
      "A hairline border paired with a wide, diffuse shadow is a recurring generated-UI signature. Commit to one — a defined edge or a soft elevation — rather than both at once.",
    id: "gpt-thin-border-wide-shadow",
    name: "Hairline border with wide shadow",
    severity: "advisory",
    skillGuideline: "hairline border plus wide diffuse shadow",
    skillSection: "Visual Details",
  },
  {
    category: "slop",
    description:
      "Repeating-gradient stripes used as surface decoration are a recurring generated-UI signature. Reach for a deliberate texture or leave the surface plain.",
    id: "repeating-stripes-gradient",
    name: "Repeating-gradient stripes",
    severity: "advisory",
    skillGuideline: "repeating-gradient decorative stripes",
    skillSection: "Visual Details",
  },
  {
    category: "slop",
    description:
      "A decorative grid or line-field background drawn with hairline linear-gradient layers tiled by a fixed pixel cell is a recurring generated-UI signature. Reserve grid overlays for actual canvas, map, blueprint, or measurement surfaces; elsewhere use product structure or a plain surface.",
    id: "codex-grid-background",
    name: "Decorative grid-line background",
    severity: "advisory",
    skillGuideline: "two-axis grid-line gradient background",
    skillSection: "Visual Details",
  },
  {
    category: "slop",
    description:
      'Dismissing something as "theater" is a recurring generated-copy tic. Say plainly what the thing does or does not do.',
    id: "theater-slop-phrase",
    name: "Theater framing copy",
    severity: "advisory",
    skillGuideline: "theater framing copy",
    skillSection: "Copy",
  },
  {
    category: "slop",
    description:
      "Scaling or rotating an image on hover is a recurring generated-UI signature. Let imagery sit still, or use a subtler, purposeful interaction.",
    id: "image-hover-transform",
    name: "Image hover transform",
    severity: "advisory",
    skillGuideline: "image scale or rotate on hover",
    skillSection: "Motion",
  },
];

const RULE_ENGINE_SUPPORT = {
  browser: new Set(["element", "page", "layout"]),
  regex: new Set(["source", "page-analyzer"]),
  "static-html": new Set(["element", "page"]),
  visual: new Set(["visual-contrast"]),
};

function getAntipattern(id) {
  return ANTIPATTERNS.find((rule) => rule.id === id);
}

// Advisory rules are detected and reported, but never treated as failures:
// the CLI lists them under a separate "Advisory" section, they do not affect
// exit codes or the failure count, and the design hook skips them by default.
// The set is derived from the registry so a rule only needs `advisory: true`.
const ADVISORY_RULE_IDS = new Set(
  ANTIPATTERNS.filter((rule) => rule.advisory === true).map((rule) => rule.id)
);

function isAdvisoryRule(id) {
  return ADVISORY_RULE_IDS.has(id);
}

function getRulesForCategory(category) {
  return ANTIPATTERNS.filter((rule) => rule.category === category);
}

function getRuleEngineSupport(engine) {
  return RULE_ENGINE_SUPPORT[engine] || new Set();
}

// Set of scope tags rules can declare (e.g. 'type', 'layout'). Used by the
// CLI --scope flag to narrow output to one design domain.
const RULE_SCOPES = new Set(ANTIPATTERNS.flatMap((rule) => rule.scopes || []));

// Keep only findings whose rule declares at least one of the requested
// scopes. An empty scope list means no filtering (default CLI behavior).
function filterByScopes(findings, scopes = []) {
  if (!scopes || scopes.length === 0) {
    return findings;
  }
  const enabled = new Set(scopes);
  return findings.filter((f) => {
    const rule = getAntipattern(f.antipattern);
    return (rule?.scopes || []).some((scope) => enabled.has(scope));
  });
}

export {
  ADVISORY_RULE_IDS,
  ANTIPATTERNS,
  filterByScopes,
  getAntipattern,
  getRuleEngineSupport,
  getRulesForCategory,
  isAdvisoryRule,
  RULE_ENGINE_SUPPORT,
  RULE_SCOPES,
};
