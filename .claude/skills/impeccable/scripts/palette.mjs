#!/usr/bin/env node
/**
 * Brand-seed picker. Returns one OKLCH seed color + the mood it most
 * naturally evokes, and teaches the model how to compose a full palette
 * around it.
 *
 * The seed is the brand's anchor color. The 5-role palette (bg, surface,
 * ink, accent, muted) is composed by the caller at runtime using their
 * judgment + the brief (PRODUCT.md / DESIGN.md / user prompt), NOT picked
 * from a frozen 4-color preset.
 *
 * Why: 4-color frozen palettes drift toward safe defaults (warm-cream bg,
 * complementary accent on near-white) regardless of brief. A single seed +
 * the model's own composition lets the same seed produce a dark-mode jazz
 * club or a light-mode hospitality brand depending on what the brief calls
 * for. Tested empirically against curated 4-color palettes; seed approach
 * wins on mood-fit in 3 of 5 cases and ties on the rest.
 *
 * Usage:
 *   node scripts/palette.mjs                  # pick at random
 *   node scripts/palette.mjs --id seed-021    # pick a specific seed
 *   node scripts/palette.mjs --from <key>     # hash <key> to a seed (deterministic)
 *
 * Env vars:
 *   IMPECCABLE_PALETTE_SEED — same as --from; useful for the eval harness
 *     to make runs reproducible.
 */

import crypto from "node:crypto";

// Seeds are inlined (129 entries, hand-curated via a tinder review of
// ~400 candidates from ColorHunt + synthesis + Radix/brand/Pantone anchors).
// Each carries a mood + strategy the judging model produced — surfaced as
// hints, not commands; the brief still drives composition.
const SEEDS = [
  {
    id: "seed-200",
    mood: "Aesop apothecary shelf — oxblood bottle glass against linen, considered and unhurried",
    oklch: [0.36, 0.137, 0.0],
    strategy:
      "Seed is a deep desaturated red-brown that reads as brand ink itself; I push primary darker toward bottle-glass oxblood, pair with a pure white surface so the red does the work, and use a clear pale-blush accent that can carry dark text in pills.",
  },
  {
    id: "seed-000",
    mood: "oxblood leather banquette in a 1940s steakhouse — low lamplight on dark wood and burgundy",
    oklch: [0.4, 0.13, 0.0],
    strategy:
      "Near-black bg with the faintest red undertone lets the oxblood primary glow like lamplit leather; warm cream ink and a brass accent complete the chophouse register.",
  },
  {
    id: "seed-002",
    mood: "darkroom red light — analog photography, blood-warm safelight glow on chemical trays",
    oklch: [0.45, 0.15, 0.0],
    strategy:
      "Near-black surface with a deep oxblood primary lets the seed function like a safelight in a darkroom — the bg disappears so the red becomes the only emotional signal.",
  },
  {
    id: "seed-003",
    mood: "darkroom safelight — the deep oxblood glow of analog photography, chemical and contemplative",
    oklch: [0.5, 0.194, 0.0],
    strategy:
      "Anchored the seed as primary against pure near-black so the red reads like a single illuminated bulb in a developing room, with cool desaturated ink to evoke silver gelatin print tones.",
  },
  {
    id: "seed-004",
    mood: "midnight boudoir — velvet rose under low lamplight, perfumed and intimate",
    oklch: [0.546, 0.204, 3.4],
    strategy:
      "Near-black surface lets the rose seed glow like silk in shadow; a warm champagne accent provides the candle-flame counterpoint without breaking the hush.",
  },
  {
    id: "seed-005",
    mood: "smoldering vermillion at dusk — the last red ember in a blacksmith's forge, iron-rich and quietly violent",
    oklch: [0.55, 0.18, 0.0],
    strategy:
      "Near-black gallery surround lets the seed read as glowing forged metal; ink stays warm-off-white, accent shifts to a hotter ember orange so the primary feels like cooling steel against a fresh strike.",
  },
  {
    id: "seed-201",
    mood: "sealing-wax crimson — one confident stamp of red on pristine white paper",
    oklch: [0.647, 0.262, 0.3],
    strategy:
      "Pure white surface lets a high-chroma crimson primary do all the brand work, paired with a hue-shifted warm coral accent for hierarchy without competing saturation",
  },
  {
    id: "seed-006",
    mood: "1960s Italian cinema — Technicolor lipstick red against a darkened theater",
    oklch: [0.65, 0.16, 0.0],
    strategy:
      "Pure near-black surface lets a saturated cinematic red and its warm peach accent perform like film light projected in a dark room — the brand colors carry the drama, the bg disappears.",
  },
  {
    id: "seed-008",
    mood: "Negroni hour at a Milanese bar — bittersweet crimson, vermouth and amaro under low tungsten",
    oklch: [0.52, 0.2, 10.4],
    strategy:
      "Seed is a saturated red-crimson with cinematic weight, so I sit it on near-black to let the primary glow like backlit liquor, with a warmer amber accent acting as the citrus twist against the bitter red.",
  },
  {
    id: "seed-010",
    mood: "Negroni hour on a Milan rooftop — bittersweet crimson, aperitivo light, polished restraint",
    oklch: [0.563, 0.223, 11.0],
    strategy:
      "Seed is a vivid carmine-red with strong chroma, so the surface gets out of the way (pure white) and lets the primary do the aperitivo work, with a cooled garnet accent for tension.",
  },
  {
    id: "seed-202",
    mood: "blush editorial pink — modern beauty-page confidence, current without sweetness",
    oklch: [0.643, 0.247, 7.0],
    strategy:
      "Pure white bg lets a saturated rose-red primary do all the brand work, paired with a deeper crimson accent for hierarchy — the single-pigment move where the color carries the mood.",
  },
  {
    id: "seed-013",
    mood: "Tuscan cellar at dusk — aged terracotta, oxidized iron, the deep red of decanted Sangiovese",
    oklch: [0.4, 0.13, 20.0],
    strategy:
      "Black surface lets the oxblood seed and copper accent glow like firelight on cellar stone; brand colors carry all the warmth while the room recedes.",
  },
  {
    id: "seed-014",
    mood: "smoldering tannery — oxblood leather, cured under low workshop light",
    oklch: [0.45, 0.15, 20.0],
    strategy:
      "Anchor the deep oxblood seed as primary against a near-black architectural ground, then lift with a single warm ember accent so the leather reads burnished rather than bloody.",
  },
  {
    id: "seed-016",
    mood: "Negroni hour on a Roman terrace — bitter campari red, vermouth, late golden light spilling on white linen",
    oklch: [0.55, 0.18, 20.0],
    strategy:
      "Pure white surface lets the campari-red primary do all the emotional work, paired with a deeper oxblood accent for bittersweet depth — Italian aperitivo restraint, not warmth-washed.",
  },
  {
    id: "seed-205",
    mood: "Aesop apothecary bottle — considered red-coral on a clinical white surface, the kind of brand restraint where one saturated object does all the work",
    oklch: [0.634, 0.254, 17.6],
    strategy:
      "Default A pure white surface lets a single coral-red primary carry the entire brand voice; accent shifts to a deeper oxblood for hierarchy without competing chroma.",
  },
  {
    id: "seed-011",
    mood: "Aperitivo hour in Milan — Campari glow on a white marble bar, crisp and effervescent",
    oklch: [0.639, 0.207, 13.5],
    strategy:
      "Pure white gallery backdrop lets the Campari-red primary ring like a single bitter note; ink is near-black with a whisper of warmth, accent shifts to a deeper oxblood for hierarchy without competing hues.",
  },
  {
    id: "seed-015",
    mood: "Negroni hour on a Milanese terrace — bittersweet vermillion, aperitivo glassware catching low sun",
    oklch: [0.527, 0.202, 22.7],
    strategy:
      "Seed becomes a saturated aperitivo-red primary against pure white so the color carries the bittersweet warmth alone, paired with a deep oxblood accent for typographic gravitas.",
  },
  {
    id: "seed-023",
    mood: "blacksmith's forge at dusk — iron heated to ember red, the deep glow of oxidized metal and quenching oil",
    oklch: [0.427, 0.175, 29.2],
    strategy:
      "Pure black bg lets the seed's ember-red glow radiate like hot iron in a dark forge; accent shifts to a copper-amber to suggest scaling metal and sparks, while ink stays near-white for tool-precise legibility.",
  },
  {
    id: "seed-206",
    mood: "Aesop apothecary bottle — considered red-orange on lab-white, calm utility with a single confident pigment",
    oklch: [0.614, 0.234, 28.2],
    strategy:
      "Pure white surface lets a saturated vermilion primary do all the brand work, paired with a deep oxblood accent for hierarchy without introducing a second hue family",
  },
  {
    id: "seed-029",
    mood: "Negroni hour at a Milanese bar — bittersweet orange-red liqueur catching late afternoon light on polished marble",
    oklch: [0.665, 0.222, 25.7],
    strategy:
      "Pure white surface lets the seed's vermilion read like Campari in a glass; a deeper oxblood accent provides the bitter depth, with neutral graphite ink keeping the editorial restraint of Italian design.",
  },
  {
    id: "seed-022",
    mood: "Pompeiian red fresco — oxidized cinnabar on a museum wall, archaeological gravity",
    oklch: [0.418, 0.155, 27.2],
    strategy:
      "Pure black gallery surface lets the seed's iron-oxide red read as a lit artifact; accent shifts to an aged terracotta amber, so primary and accent form a fired-clay duet against neutral void.",
  },
  {
    id: "seed-024",
    mood: "Mid-century darkroom under the safelight — developer trays, oxblood leather, the quiet patience of a print emerging",
    oklch: [0.464, 0.169, 26.9],
    strategy:
      "Seed becomes a deep oxblood primary; surface stays pure black so the red glows like a safelight, with a warmer ember accent for hierarchy",
  },
  {
    id: "seed-026",
    mood: "smoldering ember in a blacksmith's forge — iron-hot rust, soot, and controlled fire",
    oklch: [0.489, 0.19, 28.3],
    strategy:
      "Near-black soot background lets the seed's red-orange glow like heated metal; ink is bone-white, accent is a cooler tempered-steel orange that creates internal heat gradient with the primary.",
  },
  {
    id: "seed-027",
    mood: "Sicilian blood orange at golden hour — citrus rind, terracotta, sun on stucco",
    oklch: [0.568, 0.208, 27.1],
    strategy:
      "Seed reads as vivid blood-orange — picked pure white surface so the citrus-red primary and a deep oxblood accent do all the emotional work, like a Loro Piana editorial spread.",
  },
  {
    id: "seed-028",
    mood: "Sienna-fired ceramic studio at dusk — terracotta cooling on a wheel, hands still dusted with slip",
    oklch: [0.591, 0.172, 24.0],
    strategy:
      "Pure black stage lets the fired-clay primary glow like a kiln ember, with a deeper oxblood accent providing tonal weight rather than hue contrast — a monochrome warm-axis play.",
  },
  {
    id: "seed-033",
    mood: "1960s Italian terracotta workshop — fired clay, espresso, late-afternoon Mediterranean dust",
    oklch: [0.544, 0.169, 31.3],
    strategy:
      "Pure black ground lets the seed's burnt-sienna primary glow like a lit kiln, with a deeper oxblood accent for restrained warmth tension — the brand carries the heat, the surface stays out.",
  },
  {
    id: "seed-207",
    mood: "Aesop apothecary bottle — considered red oxide, the calm authority of a well-made object on a white shelf",
    oklch: [0.564, 0.231, 29.1],
    strategy:
      "Seed becomes the singular brand voice against pure white, with a deeper oxblood accent for hierarchy — the surface disappears so the red does all the speaking.",
  },
  {
    id: "seed-035",
    mood: "apothecary bottle — clay-fired warmth, considered retail",
    oklch: [0.663, 0.153, 32.1],
    strategy:
      "Pure white surface lets the terracotta primary do the brand work, paired with a deep umber ink and a cooler clay accent for editorial tension.",
  },
  {
    id: "seed-037",
    mood: "herbalist's bottle — considered terracotta, the warmth comes from the glass not the room",
    oklch: [0.59, 0.188, 35.8],
    strategy:
      "Seed becomes a muted terracotta primary against pure white so the brand's warmth carries entirely through the color itself; accent shifts to a deeper umber for quiet hierarchy.",
  },
  {
    id: "seed-038",
    mood: "blown-glass furnace at dusk — molten orange iron pulled from the kiln, a craftsman's signature heat",
    oklch: [0.652, 0.229, 34.8],
    strategy:
      "Pure black stage so the seed reads as live ember; primary holds the seed's heat, accent shifts to a brass-amber a hue-step away for a 1.7+ contrast pairing without leaving the fire.",
  },
  {
    id: "seed-039",
    mood: "potter's glaze terracotta — quiet shelf craft, considered and grounded",
    oklch: [0.653, 0.185, 33.5],
    strategy:
      "Seed becomes a grounded clay primary against pure white, paired with a deeper umber accent so the warmth lives entirely in the brand marks, not the surface.",
  },
  {
    id: "seed-167",
    mood: "apothecary shelf — burnished terracotta on clinical white, considered craft pharmacy",
    oklch: [0.495, 0.134, 36.0],
    strategy:
      "Treat the seed as a brand-carrying burnt-sienna against a pure paper-white surface so the warmth lives entirely in the primary, with a deep umber accent pulled along the same warm axis for typographic gravity.",
  },
  {
    id: "seed-147",
    mood: "pharmacy shelf — considered terracotta restraint, the color does the work against clinical white",
    oklch: [0.5, 0.151, 40.0],
    strategy:
      "Anchor the seed's burnt-sienna primary against a pure white surface so the rust speaks alone, with a deep umber ink and a cooler clay accent to give the palette product-brand discipline rather than environmental warmth.",
  },
  {
    id: "seed-040",
    mood: "amber bottle glass on a clean dispensary shelf — considered and clinical-warm",
    oklch: [0.66, 0.201, 40.0],
    strategy:
      "Seed becomes a burnt-amber primary against pure white so the bottle-glass color does the emotional work; accent shifts to a deep olive-bronze for the apothecary-label pairing.",
  },
  {
    id: "seed-041",
    mood: "chemist's shelf — considered orange glass, clinical restraint",
    oklch: [0.673, 0.217, 38.6],
    strategy:
      "Pure white surface lets the burnt-orange primary do all the brand work, with a deep ink-brown for editorial gravity and a muted clay accent that reads as a sibling, not a contrast.",
  },
  {
    id: "seed-042",
    mood: "terracotta glass on a marble counter — considered, unhurried",
    oklch: [0.688, 0.133, 35.8],
    strategy:
      "Seed becomes a warm clay primary against pure white so the bottle-on-marble retail feel comes from the brand color alone; a deeper umber accent gives the label-print contrast.",
  },
  {
    id: "seed-043",
    mood: "apothecary catalogue — considered terracotta, dermatological restraint, the warm color doing all the work against clinical white",
    oklch: [0.781, 0.119, 38.1],
    strategy:
      "Pure white surface lets the seed's warm clay tone read as the entire brand voice, paired with a deeper umber accent for hierarchy without competing with the primary's warmth.",
  },
  {
    id: "seed-168",
    mood: "amber glass on a clinical white shelf — considered and pharmaceutical",
    oklch: [0.4, 0.103, 50.0],
    strategy:
      "Pure white surface lets the deep amber primary act like tinted glass against a clean shelf; accent is a muted clay that complements without competing, keeping the brand quiet and product-led.",
  },
  {
    id: "seed-044",
    mood: "1970s desert highway at golden hour — sun-faded terracotta, denim dust, the warmth of a Polaroid pulled from a glovebox",
    oklch: [0.568, 0.149, 45.9],
    strategy:
      "Seed becomes a burnt-sienna primary against pure white so the terracotta does all the emotional work; a deep indigo accent acts as the denim shadow opposing the sun, creating the era's signature warm/cool tension without tinting the page.",
  },
  {
    id: "seed-045",
    mood: "dispensary shelf — considered amber glass, clinical restraint, craft pharmacy",
    oklch: [0.607, 0.163, 47.7],
    strategy:
      "Pure white bg lets the burnt-amber primary do the apothecary work alone, paired with a deeper umber accent and graphite ink for editorial calm.",
  },
  {
    id: "seed-046",
    mood: "amber glass in lamplight — quiet luxury, restrained craft",
    oklch: [0.653, 0.175, 45.0],
    strategy:
      "Pure black backdrop lets the warm amber primary glow like backlit apothecary glass, with a deeper rust accent providing tonal depth in the same hue family — monochromatic warm against neutral void.",
  },
  {
    id: "seed-047",
    mood: "botanical pharmacy label — sun-warmed amber glass on a clinical countertop, restrained",
    oklch: [0.695, 0.205, 43.2],
    strategy:
      "Pure white surface lets the burnt-amber primary and a deeper sienna accent do all the brand work, like an apothecary bottle photographed under daylight.",
  },
  {
    id: "seed-051",
    mood: "blacksmith's forge at dusk — glowing iron, hammered copper, ember light against cooling steel",
    oklch: [0.704, 0.189, 49.0],
    strategy:
      "Pure near-black surface lets the seed's molten orange burn like heated metal; accent shifts to a deeper amber-red to suggest the cooling end of the same iron, while ink stays a clean off-white so type reads like chalk on slate.",
  },
  {
    id: "seed-171",
    mood: "Klim Type Foundry specimen page — considered ochre on paper, design-school-honest",
    oklch: [0.55, 0.124, 60.0],
    strategy:
      "Seed becomes a muted ochre primary on pure white; accent is a deep ink-navy pulled across the wheel for editorial contrast without warmth-pooling in the bg",
  },
  {
    id: "seed-148",
    mood: "editorial gold — late-afternoon paper light on a serif specimen sheet, considered and dry",
    oklch: [0.65, 0.146, 60.0],
    strategy:
      "Hold the seed's amber as primary on a pure white page so the gold reads as ink rather than atmosphere, and pair with a deep aubergine accent for typographic contrast.",
  },
  {
    id: "seed-052",
    mood: "late-afternoon terracotta studio — sun-warmed clay, hands-on craft, the hour before dusk",
    oklch: [0.7, 0.13, 60.0],
    strategy:
      "Seed is a saturated amber-ochre with strong environmental association (ceramics, adobe, sunlit plaster), so I lean into Exception (a) with a faintly warm bone surface that reads as lime-washed wall, then deepen the seed slightly for primary and pair it with a fired-clay rust accent for hand-thrown warmth.",
  },
  {
    id: "seed-053",
    mood: "late-summer apricot orchard at golden hour — sun-warmed fruit, considered Californian craft",
    oklch: [0.773, 0.157, 56.6],
    strategy:
      "Seed is a juicy mid-warm orange at daylight luminance — leaning optimistic/editorial, so pure white surface lets the apricot primary glow without muddying it; a deep wine accent provides the bite.",
  },
  {
    id: "seed-149",
    mood: "1970s desert highway — late-afternoon amber light on chrome and asphalt",
    oklch: [0.6, 0.124, 70.0],
    strategy:
      "Anchor the amber seed as primary against pure black so the warm hue reads as headlight glow against night; a cooler dusk-mauve accent provides the complementary tension of horizon vs. sun.",
  },
  {
    id: "seed-054",
    mood: "late-afternoon honey on terracotta — Mediterranean stucco at golden hour, sun-baked amber",
    oklch: [0.74, 0.162, 68.1],
    strategy:
      "Seed is a saturated honey-amber at high lightness; pairing it with pure black lets the warmth read as luminous gold against gravity, like lamplight in a dark room.",
  },
  {
    id: "seed-055",
    mood: "late-summer honey hour — amber light slanting through a west-facing window, optimistic and golden",
    oklch: [0.774, 0.174, 65.1],
    strategy:
      "Anchor a saturated honey-amber primary on pure white so the warmth radiates from the brand itself, then pair with a deep teak accent for grounded contrast rather than tinting the canvas.",
  },
  {
    id: "seed-056",
    mood: "small publishing house — late-afternoon paper warmth, considered editorial gold",
    oklch: [0.691, 0.146, 74.6],
    strategy:
      "Pure white surface so the amber seed becomes the brand voice; ink stays near-black neutral and accent shifts to a deep ink-blue to give the gold something structural to lean on.",
  },
  {
    id: "seed-150",
    mood: "Klim Type Foundry specimen page — late-summer editorial gold, considered and grown-up",
    oklch: [0.75, 0.148, 80.0],
    strategy:
      "Pure white surface lets a single restrained ochre primary do all the brand work, paired with a deep ink-blue accent for typographic contrast in the Klim/Commercial Type tradition.",
  },
  {
    id: "seed-058",
    mood: "Klim Type Foundry specimen page — late-afternoon ochre, considered editorial typography",
    oklch: [0.764, 0.12, 77.1],
    strategy:
      "Pure white surface lets the ochre primary do the brand work, paired with a deep ink-blue accent for editorial contrast — the type-foundry move where one warm hue carries the whole feeling against neutral paper.",
  },
  {
    id: "seed-059",
    mood: "late afternoon in a Tuscan limonaia — sun-cured amber on whitewashed plaster",
    oklch: [0.784, 0.144, 79.8],
    strategy:
      "Pure white surface lets the saffron-amber primary and a deep olive accent carry the Mediterranean warmth, with split-complementary tension between gold and a quiet evergreen.",
  },
  {
    id: "seed-061",
    mood: "late-afternoon honey on Tuscan limestone — golden hour, slow and luminous",
    oklch: [0.817, 0.161, 75.1],
    strategy:
      "Pure white surface lets the amber primary glow like sunlight on a wall, paired with a deep terracotta accent for warm tonal contrast within the same hue family.",
  },
  {
    id: "seed-063",
    mood: "late-afternoon Tuscan sun on limestone — golden hour, considered, optimistic",
    oklch: [0.842, 0.165, 91.3],
    strategy:
      "Pure white surface lets the amber-gold primary radiate as the mood-carrier, with a deep aubergine accent providing the long shadow that golden light needs to feel three-dimensional.",
  },
  {
    id: "seed-174",
    mood: "olive grove at late afternoon — sun-cured leaves, dust, and quiet Mediterranean weight",
    oklch: [0.35, 0.075, 110.0],
    strategy:
      "Pure white surface lets a deep, sun-cured olive primary do the emotional work, with a burnt-terracotta accent providing the warm-earth counterpoint olive groves are known for.",
  },
  {
    id: "seed-117",
    mood: "editorial sage — late-summer type-foundry catalogue, considered olive-yellow on paper",
    oklch: [0.65, 0.1, 110.0],
    strategy:
      "Seed sits at olive-chartreuse; treating it as a quiet typographic primary on pure paper, with a deeper bronze-olive accent for hierarchy — the color does the work, the page disappears.",
  },
  {
    id: "seed-118",
    mood: "Klim Type Foundry specimen page — late-summer olive light on a working specimen, the honesty of a type designer showing their work",
    oklch: [0.75, 0.09, 110.0],
    strategy:
      "Pure white bg lets a desaturated olive-yellow primary do the editorial work, with a deeper olive-bronze accent providing typographic emphasis the way a specimen uses one heavy weight against the body roman.",
  },
  {
    id: "seed-065",
    mood: "late-summer olive grove at noon — sun-bleached leaves, dry stone, Mediterranean glare",
    oklch: [0.797, 0.166, 113.1],
    strategy:
      "Hold the seed as a luminous chartreuse-olive primary against pure white so the color reads as sunlit foliage, pairing it with a deep umber accent for the dry-stone contrast.",
  },
  {
    id: "seed-176",
    mood: "moss-darkened apothecary jar — herbal, shadowed, mid-19th-century botanical study",
    oklch: [0.3, 0.071, 120.0],
    strategy:
      "Seed is a deep desaturated olive-green that reads as preserved botanical pigment; I anchor it on pure white so the dim moss-green primary feels like ink on a herbarium page, with a warm ochre accent supplying the aged-paper counterpoint.",
  },
  {
    id: "seed-155",
    mood: "moss-bed forest floor at noon — chlorophyll, lichen, sunlit fern",
    oklch: [0.55, 0.142, 130.0],
    strategy:
      "Seed is a confident mid-olive green with strong chroma; mood is daylight botanical, so I let the brand greens do the work on a pure paper-white bg and pair with a warm umber accent for fern-against-bark contrast.",
  },
  {
    id: "seed-119",
    mood: "moss garden at Saihō-ji — damp stone, filtered green light through old cedar",
    oklch: [0.6, 0.154, 130.0],
    strategy:
      "Pure near-black bg lets the seed's mossy green glow like wet lichen under low light; accent shifts to a pale ochre-gold like sun catching through canopy.",
  },
  {
    id: "seed-179",
    mood: "moss on wet stone — forest floor at dusk, deep botanical hush",
    oklch: [0.3, 0.096, 140.0],
    strategy:
      "Kept the seed's deep moss green as primary against a near-black surface so the green reads as living shadow, with a pale lichen accent providing the single point of light.",
  },
  {
    id: "seed-180",
    mood: "moss-darkened apothecary — herbal tinctures in amber glass, pressed botanicals, the deep green of a conservatory at dusk",
    oklch: [0.35, 0.11, 140.0],
    strategy:
      "Near-black bg with a whisper of green undertone lets the seed's deep moss read as luminous foliage; a warm parchment accent provides the apothecary-label counterpoint without breaking the herbal register.",
  },
  {
    id: "seed-120",
    mood: "moss on weathered stone — quiet botanical garden conservatory at midday",
    oklch: [0.65, 0.1, 140.0],
    strategy:
      "Pure white bg lets the muted sage-green primary read as a considered botanical mark, with a deeper terracotta accent providing earthen counterpoint without breaking the gallery-like restraint.",
  },
  {
    id: "seed-121",
    mood: "moss garden at Saihō-ji — diffuse green light filtered through wet stone and lichen",
    oklch: [0.75, 0.09, 140.0],
    strategy:
      "Pure near-black bg lets the muted sage-green primary glow like lichen under low light; a warm pale-bone accent acts as the single ray of sun cutting through canopy.",
  },
  {
    id: "seed-182",
    mood: "moss garden at Saiho-ji — deep cultivated green under wet stone shadow, contemplative and damp",
    oklch: [0.4, 0.106, 150.0],
    strategy:
      "Near-black bg with the faintest cool-green undertone evokes shaded stone; primary holds the seed's moss tone while accent shifts to a lichen-yellow for organic counterpoint without breaking the hush.",
  },
  {
    id: "seed-157",
    mood: "moss garden at Saiho-ji — damp stone, filtered green light through cedar canopy",
    oklch: [0.55, 0.145, 150.0],
    strategy:
      "Near-black bg with a faint green undertone evokes deep forest shadow; primary holds the seed's verdant register while accent shifts to a pale lichen-cream to mimic light catching moss.",
  },
  {
    id: "seed-122",
    mood: "forest floor at first light — moss, lichen, and clean morning air",
    oklch: [0.6, 0.158, 150.0],
    strategy:
      "Seed reads as a living, daylight green; surface stays pure white so the green carries the freshness, with a cool teal accent pulling it toward dew rather than earth.",
  },
  {
    id: "seed-195",
    mood: "Considered horticulture brand — botanical research lab, the green of a healthy stem photographed in clean daylight",
    oklch: [0.65, 0.15, 145.0],
    strategy:
      "Pure white surface lets the seed's vegetal green carry the entire brand voice, paired with a deep forest ink and a warm clay accent for editorial contrast.",
  },
  {
    id: "seed-183",
    mood: "moss-stained apothecary — deep forest glass, herbal tinctures shelved in low candlelight",
    oklch: [0.35, 0.077, 160.0],
    strategy:
      "Anchored the seed as primary and built a near-black dark surface with whisper-tinted green to evoke aged apothecary glass, letting the green glow rather than shout.",
  },
  {
    id: "seed-184",
    mood: "deep forest apothecary — moss, bottle glass, and herbal tincture under afternoon light",
    oklch: [0.4, 0.087, 160.0],
    strategy:
      "Seed becomes a botanical-bottle-green primary on pure white, paired with a warm clove-amber accent to evoke herbal pharmacy contrast without tinting the surface.",
  },
  {
    id: "seed-158",
    mood: "moss on wet stone — forest floor after rain, mineral and quiet",
    oklch: [0.55, 0.119, 160.0],
    strategy:
      "Pure white surface lets the deep mossy green carry the entire mood; accent shifts to a damp slate-teal to sit beside primary like lichen on stone without competing.",
  },
  {
    id: "seed-159",
    mood: "moss-covered forest apothecary — herbal tinctures in amber glass, eucalyptus shadow",
    oklch: [0.6, 0.13, 160.0],
    strategy:
      "Anchored the green seed in a near-black backdrop so it reads like botanical glassware lit from within, with a warm amber accent pulled across the wheel to evoke tincture bottles against dark wood.",
  },
  {
    id: "seed-185",
    mood: "weathered copper patina on a Pacific Northwest greenhouse — oxidized teal, glass light, botanical hush",
    oklch: [0.45, 0.086, 170.0],
    strategy:
      "Seed sits as a deep oxidized-teal primary against pure white so the patina reads as pigment, not atmosphere; a rust-copper accent completes the verdigris/oxidation story across the warm-cool axis.",
  },
  {
    id: "seed-124",
    mood: "sea-glass on a foggy Pacific shoreline — weathered, mineral, quietly oxidized",
    oklch: [0.75, 0.08, 170.0],
    strategy:
      "Seed is a soft desaturated teal-green; pairing it on pure white lets the mineral primary read as patinated copper-glass, with a deeper kelp-toned primary and a rusted coral accent to spark the muted teal against its complement.",
  },
  {
    id: "seed-160",
    mood: "weathered copper patina on a museum bronze — oxidized teal, conservatorial quiet",
    oklch: [0.55, 0.095, 180.0],
    strategy:
      "Pure near-black gallery surround lets the patina-teal primary glow like a lit artifact, with a warm verdigris-adjacent accent providing the oxidation contrast against the cool seed.",
  },
  {
    id: "seed-161",
    mood: "field-station verdigris — calm oxidized green-blue on plain paper, the quiet confidence of an instrument that just works",
    oklch: [0.72, 0.1, 188.0],
    strategy:
      "Seed teal carries the entire mood as a single considered brand color on pure white, with a desaturated copper accent providing warm signal against the cool primary without competing for attention.",
  },
  {
    id: "seed-186",
    mood: "deep hydrothermal vent — mineral teal under pressure, the cold blue-green of oxidized copper in submerged light",
    oklch: [0.45, 0.074, 200.0],
    strategy:
      "Near-black surface lets the mineral teal glow as if lit from within; accent shifts toward verdigris-copper to suggest patina on submerged metal, while ink stays cool-neutral to keep the register austere rather than aquatic-cute.",
  },
  {
    id: "seed-125",
    mood: "tide-gauge teal — calm working blue-green, the color of clean water and clear morning air",
    oklch: [0.65, 0.1, 200.0],
    strategy:
      "Pure white surface lets a single muted-teal primary do all the brand work, with a deeper marine accent providing hierarchy without competing chroma.",
  },
  {
    id: "seed-126",
    mood: "harbor-works teal — quiet competence, paint chosen for cranes and lock gates that face hard weather",
    oklch: [0.75, 0.08, 200.0],
    strategy:
      "Hold the seed's muted teal as primary, pair with a sharper cyan-leaning accent for lift, and let a pure white surface do the disappearing act so the teal reads as an instrument mark, not an atmosphere.",
  },
  {
    id: "seed-162",
    mood: "weathered nautical instrument — patinated brass on oxidized steel, the cool blue-grey of a ship's chronometer at dawn",
    oklch: [0.55, 0.091, 210.0],
    strategy:
      "Pure white surface lets the muted teal-steel primary read as a precise instrument mark, with a warm brass accent providing the single point of patina against clinical white.",
  },
  {
    id: "seed-163",
    mood: "deep harbor at dusk — weathered nautical instruments, brass dials on oxidized steel",
    oklch: [0.45, 0.086, 230.0],
    strategy:
      "Near-black background with subtle cool tint evokes the marine dusk; primary holds the seed's teal-blue while a warm brass accent creates the instrument-on-steel tension.",
  },
  {
    id: "seed-164",
    mood: "deep harbor at dawn — cold steel water, fog-muted light, the quiet before the boats leave",
    oklch: [0.55, 0.105, 230.0],
    strategy:
      "Pure near-black bg lets the seed's cold marine blue read as a luminous beacon, while a pale frost-cyan accent evokes diffused dawn light cutting through fog.",
  },
  {
    id: "seed-127",
    mood: "weather-station blue — clear-sky reading at altitude, calm working clarity",
    oklch: [0.65, 0.1, 230.0],
    strategy:
      "Anchor the seed as a confident mid-blue primary on pure white so the brand color carries all the atmospheric feeling, with a deep navy accent for hierarchy and a soft slate muted for body text.",
  },
  {
    id: "seed-128",
    mood: "barometer sky-blue — a calm reading before the weather turns, considered and clear",
    oklch: [0.75, 0.08, 230.0],
    strategy:
      "Pure white surface lets the muted sky-blue primary carry the meteorological calm, with a deep-navy accent providing readable weight against the soft primary.",
  },
  {
    id: "seed-187",
    mood: "deep harbor at blue hour — wet stone, cold steel, the quiet before night fully lands",
    oklch: [0.35, 0.078, 240.0],
    strategy:
      "Near-black architectural bg with a hint of marine chroma lets the seed read as ambient atmosphere rather than UI chrome; a cooler steel accent sits opposite the warmer-shifted primary for navigational clarity.",
  },
  {
    id: "seed-077",
    mood: "pre-dawn signal tower — cold blue solitude, instruments glowing against the dark",
    oklch: [0.578, 0.13, 241.7],
    strategy:
      "Pure near-black bg lets the seed's cold tower-light blue glow as the sole emotional source, with a frost-cyan accent acting as a secondary indicator light.",
  },
  {
    id: "seed-188",
    mood: "blueprint ink — the calm authority of a drafting table where every line is deliberate, drawn on a clean page",
    oklch: [0.4, 0.11, 250.0],
    strategy:
      "Held the seed as a deep indigo primary against pure white so the brand color carries all the gravity; accent shifts to a cooler, brighter cyan-blue to create a crisp hierarchy pair without warming the surface.",
  },
  {
    id: "seed-165",
    mood: "blueprint room at dusk — drafting table, graphite, civic-engineering blue",
    oklch: [0.45, 0.123, 250.0],
    strategy:
      "Seed is a mid-deep architectural blue with real chroma and no environmental cue, so I stay out of the way with a pure white surface and let the primary do all the talking, pairing it with a burnt-ochre accent for drafting-pencil contrast.",
  },
  {
    id: "seed-079",
    mood: "twilight cartography — the blue of deep dusk over open water, precise and navigational",
    oklch: [0.478, 0.136, 251.8],
    strategy:
      "Pure white surface lets the seed's oceanic blue act as a single navigational anchor, with a warm amber accent struck across it like a lighthouse beam at dusk.",
  },
  {
    id: "seed-080",
    mood: "surveyor's ink blue — the calm, exact register of a hand-ruled site plan where every line is intentional",
    oklch: [0.541, 0.122, 248.2],
    strategy:
      "Pure white surface lets the considered indigo-blue primary carry the entire brand; a deeper navy accent provides hierarchy without warmth, keeping the palette in a single cool family for that focused, exacting feel",
  },
  {
    id: "seed-166",
    mood: "pre-dawn flight deck — instrument glow against deep cobalt sky, precise and quietly intense",
    oklch: [0.55, 0.149, 250.0],
    strategy:
      "Near-black bg with the faintest cool tint reads like a darkened cockpit; the seed becomes a luminous instrument-blue primary, paired with a warm amber accent that mimics avionics readouts for unmistakable signal contrast.",
  },
  {
    id: "seed-081",
    mood: "deep-sea research vessel at dawn — instrument glow against cold steel light",
    oklch: [0.65, 0.16, 250.0],
    strategy:
      "Pure near-white bg keeps the palette technical and instrument-like; the seed blue holds as primary while a desaturated steel-cyan accent reads like signal readouts on glass.",
  },
  {
    id: "seed-082",
    mood: "high-altitude flight deck at dawn — cold cabin instruments glowing against a sky still holding night",
    oklch: [0.742, 0.14, 247.4],
    strategy:
      "Near-black cockpit ground with a faint blue cast lets the seed read as an illuminated instrument; primary holds the seed, accent shifts to cyan for signal/indicator contrast.",
  },
  {
    id: "seed-210",
    mood: "printmaker's night sky — late-night focused work, the deep blue of a studio at 2am where everything else falls away",
    oklch: [0.36, 0.14, 260.0],
    strategy:
      "Pure black bg lets the indigo primary carry all the cognitive-focus weight, with a slightly brighter periwinkle accent for lift — the surface disappears so the indigo feels weightless.",
  },
  {
    id: "seed-189",
    mood: "pre-dawn observatory — cold instrument blue, star-chart precision",
    oklch: [0.4, 0.13, 260.0],
    strategy:
      "Seed becomes the primary on pure black so the deep instrument-blue glows like a calibration light, with a faint cyan accent reading as starlight against the void.",
  },
  {
    id: "seed-211",
    mood: "workwear denim indigo — deep-dyed cloth made for focused hands, calm authority without coldness",
    oklch: [0.42, 0.161, 260.0],
    strategy:
      "Hold the seed as a deep indigo primary against pure white, then pair with a slightly warmer, lighter periwinkle accent to create gentle hue separation without breaking the disciplined register.",
  },
  {
    id: "seed-129",
    mood: "pre-dawn observatory — deep cobalt sky just before astronomical twilight, instruments cool to the touch",
    oklch: [0.45, 0.15, 260.0],
    strategy:
      "Near-black surface lets the cobalt seed read as luminous starlight; a single warm amber accent acts as the calibration lamp against the cold blue field.",
  },
  {
    id: "seed-084",
    mood: "pre-dawn flight deck — instrument glow against deep cobalt sky, precise and awake",
    oklch: [0.476, 0.207, 261.2],
    strategy:
      "Default B black bg lets the cobalt primary read as a luminous instrument signal, with a cyan accent striking the analogous 'cockpit display' relationship.",
  },
  {
    id: "seed-085",
    mood: "pre-dawn flight deck — instrument glow against deep cobalt sky",
    oklch: [0.681, 0.132, 258.4],
    strategy:
      "Anchored the seed as a luminous primary against a near-black architectural ground, with a warm amber accent acting as the single instrument light cutting through cold blue.",
  },
  {
    id: "seed-086",
    mood: "Scandinavian winter morning — quiet light through frost, pale sky over snow",
    oklch: [0.767, 0.106, 255.9],
    strategy:
      "Anchored a pure white editorial stage so the seed's cool sky-blue reads as crisp polar light, with a deeper navy primary providing the only saturated weight — like a single dark pine against snow.",
  },
  {
    id: "seed-083",
    mood: "deep cobalt twilight — the moment after sunset when the sky goes electric blue and city windows start to glow",
    oklch: [0.34, 0.159, 262.4],
    strategy:
      "Pure black stage lets the cobalt seed act as a luminous neon-window glow, with a warm amber accent across the wheel for the lit-window contrast.",
  },
  {
    id: "seed-212",
    mood: "indigo dye vat — deep pigment worked by hands that care about craft",
    oklch: [0.36, 0.219, 270.0],
    strategy:
      "Anchored the deep indigo seed as primary on a pure white surface so the brand color carries all the weight, with a slightly cooler violet-blue accent for hierarchy without competing chroma.",
  },
  {
    id: "seed-130",
    mood: "fountain-pen indigo — considered ink on paper, no theatrics",
    oklch: [0.4, 0.15, 270.0],
    strategy:
      "Pure white surface lets a deep cool indigo carry all the brand weight, paired with a slightly warmer violet-blue accent for hierarchy without acid.",
  },
  {
    id: "seed-213",
    mood: "night-study indigo — the kind of blue-violet that sits behind a desk lamp at 11pm without shouting",
    oklch: [0.411, 0.241, 267.9],
    strategy:
      "Pure black canvas lets a saturated indigo primary do all the brand work, with a cooler cyan-violet accent providing a second point of light without competing.",
  },
  {
    id: "seed-131",
    mood: "monastic indigo dusk — vespers light through stained glass, contemplative and severe",
    oklch: [0.45, 0.18, 270.0],
    strategy:
      "Seed becomes a deep indigo primary against pure near-black so the violet reads as luminous stained-glass against architectural shadow, with a cooler iris accent for tonal lift.",
  },
  {
    id: "seed-088",
    mood: "pre-dawn astronomer's notebook — deep indigo sky just before the stars fade, ink and graphite",
    oklch: [0.476, 0.158, 268.5],
    strategy:
      "Near-black bg with the faintest cool tint to evoke night sky without theatrics; primary holds the seed's indigo, accent shifts to a paler periwinkle for stellar contrast, keeping the palette monochromatic-cool and observational.",
  },
  {
    id: "seed-196",
    mood: "bookbinder's indigo — the deep-focus blue-violet of cloth-bound reference volumes, the color of a well-set line of type",
    oklch: [0.53, 0.13, 268.0],
    strategy:
      "Pure white bg lets the indigo seed do all the brand work as primary, with a slightly darker, more saturated violet-shifted accent for hierarchy and emphasis — the surface disappears so the brand color reads as the entire identity.",
  },
  {
    id: "seed-132",
    mood: "observatory dusk — the quiet violet of a reading room at closing hour, late-afternoon thinking",
    oklch: [0.7, 0.12, 270.0],
    strategy:
      "Pure white surface lets a muted indigo-violet primary and a slightly cooler accent do all the brand work, keeping the register calm and studied rather than theatrical.",
  },
  {
    id: "seed-090",
    mood: "printmaker's violet — the ink of a limited-edition run, not a nightclub",
    oklch: [0.445, 0.206, 279.1],
    strategy:
      "Anchor the seed as a confident primary on pure white, with a cooler indigo-shift accent that reads as a sibling ink, so the brand violet does all the emotional work.",
  },
  {
    id: "seed-133",
    mood: "study at blue hour — the considered violet of a room where thinking happens",
    oklch: [0.5, 0.16, 280.0],
    strategy:
      "Seed becomes a measured indigo primary on pure white; accent shifts to a cooler blue-violet to create hierarchy without nightclub saturation, letting the brand color do all the emotional work.",
  },
  {
    id: "seed-137",
    mood: "violet ink at last light — late-evening focus, the desk of someone who cares about craft",
    oklch: [0.7, 0.12, 290.0],
    strategy:
      "Pure black surface lets a single restrained indigo-violet carry the brand, with a cooler periwinkle accent providing hierarchy without competing — lights-off discipline.",
  },
  {
    id: "seed-100",
    mood: "velvet boudoir at last call — bruised orchid and lipstick traces under low lamplight",
    oklch: [0.45, 0.15, 330.0],
    strategy:
      "Pure near-black surface lets a deep magenta-rose primary smolder while a warm peach accent acts like skin-lit lamplight — drama lives in the brand pair, not the room.",
  },
  {
    id: "seed-103",
    mood: "1980s Memphis boudoir — powder-pink neon humming against lacquered black, lipstick and lacquer",
    oklch: [0.65, 0.16, 330.0],
    strategy:
      "Near-black gallery surface lets the magenta-pink seed read as lit neon; accent shifts to warm coral to create cinematic dichromatic tension without competing chroma.",
  },
  {
    id: "seed-228",
    mood: "riso-printed plum — the inky violet of a small-press poster, considered and current",
    oklch: [0.36, 0.147, 340.0],
    strategy:
      "Held the seed as a deep plum primary against pure white so the brand color does the emotional work; paired with a muted rose accent for warmth without breaking the printed-page restraint.",
  },
  {
    id: "seed-107",
    mood: "orchid-house plum — hothouse confidence, considered magenta with modern poise",
    oklch: [0.5, 0.2, 340.0],
    strategy:
      "Pure white surface lets a saturated magenta-plum primary carry all the brand voice, paired with a cooler violet-leaning accent for hierarchy without competing.",
  },
  {
    id: "seed-198",
    mood: "silkscreen plum — confident, considered, pulled by hand",
    oklch: [0.6, 0.21, 340.0],
    strategy:
      "Anchor a saturated plum primary against pure white so the brand color does all the emotional work, with a deeper magenta-rose accent for hierarchy.",
  },
  {
    id: "seed-112",
    mood: "neon signage pink — one confident tube of light doing all the work against a clean night wall",
    oklch: [0.754, 0.193, 343.4],
    strategy:
      "Anchor the seed pink as a saturated brand primary on pure white so the color carries all the personality; pair with a cooler plum accent to give the pink something to push against without competing.",
  },
  {
    id: "seed-229",
    mood: "crushed-berry rose — deep magenta pressed like ink from dark fruit, confident and current",
    oklch: [0.42, 0.163, 350.0],
    strategy:
      "pure white surface lets a single deep berry-rose primary do all the brand work, paired with a cooler indigo accent for a crisp warm-cool contrast",
  },
  {
    id: "seed-113",
    mood: "1960s velvet rope nightclub — crushed magenta, low light, cigarette smoke catching a spotlight",
    oklch: [0.47, 0.173, 354.8],
    strategy:
      "Pure black stage so the seed's smoky magenta reads as a single hot spotlight, paired with a cooler violet accent for the second light cue.",
  },
  {
    id: "seed-114",
    mood: "fin-de-siècle Parisian rose — velvet curtain, theatre program, lipstick blotted on linen",
    oklch: [0.57, 0.158, 353.3],
    strategy:
      "Drop bg to true black so the dusty-rose primary reads as stage-lit silk; accent shifts to a warmer coral-mauve at higher lightness to create gentle hue rotation without breaking the romance.",
  },
  {
    id: "seed-199",
    mood: "fresh-cut peony rose — considered pink, confident and current without nostalgia",
    oklch: [0.65, 0.18, 350.0],
    strategy:
      "Pure white surface lets a saturated rose primary do the brand work, paired with a deep plum accent for hierarchy — one saturated hue carrying the whole voice against white.",
  },
  {
    id: "seed-115",
    mood: "backstage at a cabaret — velvet rope, lipstick mark on a champagne glass",
    oklch: [0.636, 0.218, 355.3],
    strategy:
      "Seed reads as a saturated stage-light magenta-red; I push it into pure black so the primary glows like a neon sign and the accent (a cold pearl-pink) acts as the spotlight rim — the room is dark, the color does the singing.",
  },
  {
    id: "seed-230",
    mood: "neon rose at dusk — a considered pink, confident, alive, and clear-headed",
    oklch: [0.65, 0.249, 354.5],
    strategy:
      "Pure white bg lets a saturated rose-magenta primary carry all the brand energy, paired with a cooler indigo accent for steady contrast — one saturated hue doing all the talking against white.",
  },
  {
    id: "seed-231",
    mood: "riso ink pink-magenta — one confident pigment that feels alive without shouting",
    oklch: [0.682, 0.241, 353.2],
    strategy:
      "Default A pure white bg lets the saturated pink-magenta primary do all the brand work, with a near-complementary cool teal accent for crisp clarity and a neutral ink for editorial calm",
  },
  {
    id: "seed-116",
    mood: "modern beauty counter — fresh rose-pink, confident and current without being saccharine",
    oklch: [0.734, 0.183, 356.8],
    strategy:
      "Pure white surface so the rose-pink primary carries all the brand warmth, paired with a near-black ink and a desaturated mauve accent for editorial restraint.",
  },
];

function parseArgs(argv) {
  const args = { from: null, id: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--id" && argv[i + 1]) {
      args.id = argv[++i];
    } else if (a === "--from" && argv[i + 1]) {
      args.from = argv[++i];
    }
  }
  return args;
}

// Hash a key into a stable float in [0, 1) for deterministic weighted picks.
function hashUnit(key) {
  const h = crypto.createHash("sha256").update(key).digest();
  return h.readUInt32BE(0) / 0x1_00_00_00_00;
}

// The curated library is hue-skewed (more reds/oranges than teals/magentas)
// because that's where the source material + taste landed. Left uniform, a
// random pick would land on red ~1/3 of the time. Inverse-frequency weighting
// gives each seed a weight of 1/(count in its 30° hue bucket), so each hue
// ZONE is roughly equally likely to be chosen regardless of how many seeds it
// holds — fair rainbow exposure across runs without pruning the library.
function buildWeights(seeds) {
  const bucketCount = {};
  const bucketOf = (s) => Math.floor((((s.oklch[2] % 360) + 360) % 360) / 30);
  for (const s of seeds) {
    const b = bucketOf(s);
    bucketCount[b] = (bucketCount[b] || 0) + 1;
  }
  const weights = seeds.map((s) => 1 / bucketCount[bucketOf(s)]);
  const total = weights.reduce((a, b) => a + b, 0);
  return { total, weights };
}

function weightedPick(seeds, unit) {
  const { weights, total } = buildWeights(seeds);
  let target = unit * total;
  for (let i = 0; i < seeds.length; i++) {
    target -= weights[i];
    if (target < 0) {
      return seeds[i];
    }
  }
  return seeds[seeds.length - 1];
}

function pickSeed(seeds, { id, from }) {
  if (id) {
    const found = seeds.find((s) => s.id === id);
    if (!found) {
      console.error(`no seed with id "${id}"`);
      process.exit(2);
    }
    return found;
  }
  const envFrom = process.env.IMPECCABLE_PALETTE_SEED;
  const key = from || envFrom;
  const unit = key ? hashUnit(key) : Math.random();
  return weightedPick(seeds, unit);
}

function fmtOklch([L, C, H]) {
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
}

function hueWord(H) {
  if (H < 15 || H >= 345) {
    return "pure red";
  }
  if (H < 35) {
    return "warm red / crimson";
  }
  if (H < 55) {
    return "warm coral / burnt orange";
  }
  if (H < 80) {
    return "orange / honey";
  }
  if (H < 105) {
    return "warm amber / honey-gold";
  }
  if (H < 135) {
    return "yellow-green / olive";
  }
  if (H < 170) {
    return "green";
  }
  if (H < 200) {
    return "teal";
  }
  if (H < 230) {
    return "sky blue";
  }
  if (H < 265) {
    return "cobalt / indigo";
  }
  if (H < 295) {
    return "violet / purple";
  }
  if (H < 330) {
    return "magenta / pink";
  }
  return "deep pink / rose";
}

// ---------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));
const seed = pickSeed(SEEDS, args);
const [L, C, H] = seed.oklch;

// The mood + strategy on each seed were derived by the model that
// originally judged it. We surface them as *hints*, not commands —
// the brief should still drive what the seed becomes.
const moodHint = seed.mood ? ` (one read: "${seed.mood}")` : "";
const strategyHint = seed.strategy
  ? `\n  - one example strategy: ${seed.strategy}`
  : "";

// ---------------------------------------------------------------
// Fat tool-exit response — what the model sees on stdout.
// ---------------------------------------------------------------

process.stdout.write(`BRAND SEED · ${seed.id}

Seed color (anchor for your primary brand color):
  ${fmtOklch(seed.oklch)} — ${hueWord(H)}${moodHint}

This is the brand's anchor — a single beautiful color. Compose the rest of
the palette around it using YOUR judgment, the brief (PRODUCT.md /
DESIGN.md / the user's prompt), and the color-strategy guidance already in
SKILL.md.

How to use:

1. Read the brief. Write one specific phrase describing the mood this
   product calls for. Be granular. Good: "1970s travel poster — sun-baked
   warmth, considered", "midnight jazz club — smoky brass, saxophone
   light", "Scandinavian winter morning — quiet light through frost". Bad:
   "modern and clean", "warm and inviting". The first lets you compose; the
   second is generic and will produce generic palettes.

2. The seed's hue (${H.toFixed(0)}°) anchors your primary brand color. You
   choose L and C to match the mood. The same hue can be deep-and-velvet,
   bright-and-confident, or pale-and-faded — pick the one the mood demands.
   Primary's hue should stay within ±10° of the seed.${strategyHint}

3. Now compose the full palette in OKLCH (5 more roles):
     • bg       — the most important architectural choice.
                  CORE PRINCIPLE: the mood lives in the BRAND COLORS
                  (primary + accent) and typography, NOT in the surface.
                  A warm brand puts the warmth in its primary against a
                  pure surface. Putting warmth in BOTH primary AND bg is
                  the AI cliché.

                  DEFAULT A — PURE white: exactly oklch(1.000 0.000 0).
                    Not 0.99, not chroma 0.002. The most confident
                    brands in every field — fashion houses, galleries,
                    publishers, tool makers — use literal #ffffff.
                    Don't add hidden warmth.

                  DEFAULT B — PURE black/near-black: L 0.04-0.12,
                    chroma exactly 0.000. No hue tint. Pick L for the
                    mood (cinema dark, gallery dark, instrument-panel
                    dark); C stays 0.

                  ALT 2 — TINTED: chroma 0.015-0.05.
                    Use ONLY when:
                    (a) the mood is EXPLICITLY environmental — the surface
                        IS part of the brand (1920s lacquered interior,
                        leather library, ceramic studio, hotel lobby), or
                    (b) the seed itself is desaturated (chroma < 0.10) and
                        needs a tinted surface to read as a brand.
                    NOT for "feels warm" / "modern + warm" / "moody". If
                    your mood says "warm" but doesn't name a specific
                    environment, use PURE white and let primary carry
                    the warmth.

                  HEURISTIC: if the seed's chroma > 0.10 and the mood
                  doesn't name a specific environment, it's almost
                  always PURE white. Target distribution across many
                  palettes: ~50% pure white, ~25% pure black, ~25%
                  tinted.
     • surface  — bg pulled slightly toward ink (10-15% mix). Same hue
                  family as bg. Used for cards, panels, sections.
     • ink      — body text color. Must reach ≥7:1 contrast vs bg.
                  Can carry the brand hue at low chroma in light mode
                  (slight warmth or coolness toward the brand).
     • accent   — a SECOND brand color, distinct from primary in BOTH
                  hue AND lightness. Picked to complement the mood (not
                  default-complementary across the wheel). Used for
                  badges, status pills, links, accent rules.
     • muted    — secondary text. Ink pulled 40% toward bg, keeping ink's
                  hue. Must reach ≥3.5:1 contrast vs bg.

4. Pick a color STRATEGY (the four steps from SKILL.md):
     • Restrained: tinted neutrals + accent ≤10% — product default
     • Committed: one saturated color carries 30-60% — identity-driven
     • Full palette: 3-4 named roles each used deliberately — brand work
     • Drenched: the surface IS the color — campaign, hero, statement
   The brief picks the strategy. A startup dashboard ≠ a perfume brand.

Hard rules (already in SKILL.md, recapped because the seed step is where
they actually bite):

  - OKLCH only — never hex. Never #RRGGBB.
  - ink-vs-bg WCAG contrast ≥ 7 (body text must be readable)
  - primary chroma ≤ 0.23 (above this, primary glows perceptually and
    no text on it is readable — acid-bright is a UI failure)
  - if primary L > 0.78, primary chroma ≤ 0.18 (the fluorescent zone)
  - primary-vs-accent contrast ≥ 1.7 (they must be visually distinct,
    not two variants of the same hue at similar lightness)
  - accent must carry readable text on a filled badge/pill: EITHER
    saturated (chroma ≥ 0.10) OR clearly light (L ≥ 0.85) OR clearly
    dark (L ≤ 0.30). Never a muddy mid-tone (L 0.45-0.72 + chroma < 0.10)
    — taupe/mushroom/dusty-grey accents read as weak and can't hold text
    either way. Saturate it or push its lightness to a clear light/dark.
  - avoid the saturated AI attractor zones: claude-beige (warm-cream bg
    + dusty brown primary), forest-green-on-cream, AI-purple-on-white,
    navy-cream-with-orange-accent

TEXT-ON-COLOR FILLS — pick by perceptual contrast, not just WCAG. The
rule applies to ANY element where text sits on a saturated color fill:
primary buttons, accent buttons, badges, status pills, tag highlights,
filled callouts. Don't only think "primary button" — apply consistently.

For any saturated mid-luminance color (L between 0.42 and 0.78, chroma ≥
0.08), use WHITE text (or near-white from your bg), not dark text — even
if WCAG says dark technically passes. The Helmholtz-Kohlrausch effect
makes saturated colors appear brighter than their luminance suggests,
and dark text on a warm-or-cool-saturated fill reads as muddy.

Convention: saturated action fills in the wild, from fast-food reds to
status pills to filled badges, near-universally carry white text.

Dark text is correct only on PALE fills (L > 0.85) or PURE-NEUTRAL fills
(chroma near 0). Everything else: white text.

Return your composed palette in CSS custom properties using OKLCH, then
build with it. The seed is the start, not the recipe.
`);
