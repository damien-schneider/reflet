// ─── Section 2: Color Utilities ─────────────────────────────────────────────

function isNeutralColor(color) {
  if (!color || color === "transparent") {
    return true;
  }

  // rgb/rgba — use channel spread. Threshold 30 ≈ 11.7% of the 0–255 range.
  const rgb = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) {
    return (
      Math.max(+rgb[1], +rgb[2], +rgb[3]) -
        Math.min(+rgb[1], +rgb[2], +rgb[3]) <
      30
    );
  }

  // oklch()/lch() — chroma is the second numeric component.
  // oklch chroma is ~0–0.4 in sRGB gamut; >= 0.02 reads as tinted, not gray.
  // lch chroma is ~0–150; >= 3 reads as tinted. jsdom emits both formats
  // literally (it does NOT convert them to rgb).
  const oklch = color.match(/oklch\(\s*[\d.]+%?\s*([\d.-]+)/i);
  if (oklch) {
    return Number.parseFloat(oklch[1]) < 0.02;
  }
  const lch = color.match(/lch\(\s*[\d.]+%?\s*([\d.-]+)/i);
  if (lch) {
    return Number.parseFloat(lch[1]) < 3;
  }

  // oklab()/lab() — a and b are signed axes; chroma = sqrt(a² + b²).
  // oklab a/b are ~-0.4..0.4, threshold 0.02. lab a/b are ~-128..127, threshold 3.
  const oklab = color.match(/oklab\(\s*[\d.]+%?\s*([\d.-]+)\s+([\d.-]+)/i);
  if (oklab) {
    const a = Number.parseFloat(oklab[1]),
      b = Number.parseFloat(oklab[2]);
    return Math.hypot(a, b) < 0.02;
  }
  const lab = color.match(/lab\(\s*[\d.]+%?\s*([\d.-]+)\s+([\d.-]+)/i);
  if (lab) {
    const a = Number.parseFloat(lab[1]),
      b = Number.parseFloat(lab[2]);
    return Math.hypot(a, b) < 3;
  }

  // hsl/hsla — saturation is the second numeric component (percent).
  // Modern jsdom usually converts hsl() to rgb, but handle it directly for
  // safety across versions and for any engine that preserves the format.
  const hsl = color.match(/hsla?\(\s*[\d.-]+\s*,?\s*([\d.]+)%/i);
  if (hsl) {
    return Number.parseFloat(hsl[1]) < 10;
  }

  // hwb(hue whiteness% blackness%) — a pixel is fully gray when
  // whiteness + blackness >= 100; chroma-like saturation = 1 - (w+b)/100.
  const hwb = color.match(/hwb\(\s*[\d.-]+\s+([\d.]+)%\s+([\d.]+)%/i);
  if (hwb) {
    const w = Number.parseFloat(hwb[1]),
      b = Number.parseFloat(hwb[2]);
    return 1 - Math.min(100, w + b) / 100 < 0.1;
  }

  // Unknown / unrecognized format — err on the side of DETECTING rather
  // than silently skipping. This is the opposite of the previous default,
  // which was the root cause of the oklch bug.
  return false;
}

function parseRgb(color) {
  if (!color || color === "transparent") {
    return null;
  }
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) {
    return null;
  }
  return { a: m[4] === undefined ? 1 : +m[4], b: +m[3], g: +m[2], r: +m[1] };
}

function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.039_28 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(c1, c2) {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// The CSS color functions worth pulling out of a longer declaration. The set
// is deliberately closed: `linear-gradient(` and `url(` also look like
// `name(` and must not be read as colors.
const COLOR_FUNCTION_NAMES = new Set([
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "hwb",
  "oklch",
  "oklab",
  "lch",
  "lab",
  "color",
  "color-mix",
]);

// Pull every color-function token out of a value, with balanced-paren capture
// so nested forms (`color-mix(in oklab, oklch(...) 20%, transparent)`) survive
// whole. Returns the raw substrings in source order.
function extractColorFunctionTokens(value) {
  const str = String(value || "");
  const tokens = [];
  const re = /([a-z][a-z-]*)\(/gi;
  let m;
  while ((m = re.exec(str)) !== null) {
    if (!COLOR_FUNCTION_NAMES.has(m[1].toLowerCase())) {
      continue;
    }
    let depth = 0,
      end = -1;
    for (let i = m.index + m[0].length - 1; i < str.length; i++) {
      if (str[i] === "(") {
        depth++;
      } else if (str[i] === ")") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end < 0) {
      break;
    }
    tokens.push(str.slice(m.index, end + 1));
    re.lastIndex = end + 1;
  }
  return tokens;
}

function parseGradientColors(bgImage) {
  if (!(bgImage && bgImage.includes("gradient"))) {
    return [];
  }
  const colors = [];
  const tokenSpans = [];
  let from = 0;
  // Stops arrive in whatever syntax the author wrote and the browser kept.
  // A dark ground painted as `linear-gradient(oklch(...), oklch(...))` used
  // to read as a gradient with no stops at all.
  for (const token of extractColorFunctionTokens(bgImage)) {
    const start = bgImage.indexOf(token, from);
    if (start < 0) {
      break;
    }
    tokenSpans.push({ end: start + token.length, start });
    from = start + token.length;
    const c = parseAnyColor(token);
    if (c) {
      colors.push(c);
    }
  }
  for (const m of bgImage.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    // Nested hex inside color-mix is an ingredient, not a stop (issue #578).
    if (tokenSpans.some((s) => m.index >= s.start && m.index < s.end)) {
      continue;
    }
    const h = m[1];
    if (h.length === 6) {
      colors.push({
        a: 1,
        b: Number.parseInt(h.slice(4, 6), 16),
        g: Number.parseInt(h.slice(2, 4), 16),
        r: Number.parseInt(h.slice(0, 2), 16),
      });
    } else {
      colors.push({
        a: 1,
        b: Number.parseInt(h[2] + h[2], 16),
        g: Number.parseInt(h[1] + h[1], 16),
        r: Number.parseInt(h[0] + h[0], 16),
      });
    }
  }
  return colors;
}

function hasChroma(c, threshold = 30) {
  if (!c) {
    return false;
  }
  return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) >= threshold;
}

function getHue(c) {
  if (!c) {
    return 0;
  }
  const r = c.r / 255,
    g = c.g / 255,
    b = c.b / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  if (max === min) {
    return 0;
  }
  const d = max - min;
  let h;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6;
  } else {
    h = ((r - g) / d + 4) / 6;
  }
  return Math.round(h * 360);
}

function colorToHex(c) {
  if (!c) {
    return "?";
  }
  return (
    "#" + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("")
  );
}

// ─── Color-space conversions ────────────────────────────────────────────────
//
// Every function here lands on 8-bit sRGB, clamped to gamut. Chrome, Safari,
// and Firefox all keep the authored color space in getComputedStyle output
// (`oklch(0.84 0.19 80.46)`, `lch(20 5 60)`, `color(srgb 1.04 0.72 -0.21)`),
// so a detector that only reads rgb() is blind on any modern palette. The
// expected outputs are pinned in tests/detect-antipatterns.test.js against
// what Chrome itself paints for the same strings.

function clamp01(x) {
  return Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0;
}

// Linear-light sRGB channel to the encoded 0-255 value.
function encodeSrgbChannel(x) {
  const c = clamp01(x);
  return Math.round(
    (c <= 0.003_130_8 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255
  );
}

function decodeSrgbChannel(x) {
  const c = Number.isFinite(x) ? x : 0;
  const sign = c < 0 ? -1 : 1;
  const abs = Math.abs(c);
  return (
    sign * (abs <= 0.040_45 ? abs / 12.92 : ((abs + 0.055) / 1.055) ** 2.4)
  );
}

function linearSrgbToColor(r, g, b, a = 1) {
  return {
    a,
    b: encodeSrgbChannel(b),
    g: encodeSrgbChannel(g),
    r: encodeSrgbChannel(r),
  };
}

// OKLab to sRGB (Björn Ottosson's matrices). L in 0..1, a/b are signed axes.
function oklabToRgb(L, a, b) {
  const l_ = L + 0.396_337_777_4 * a + 0.215_803_757_3 * b;
  const m_ = L - 0.105_561_345_8 * a - 0.063_854_172_8 * b;
  const s_ = L - 0.089_484_177_5 * a - 1.291_485_548 * b;
  const lc = l_ * l_ * l_,
    mc = m_ * m_ * m_,
    sc = s_ * s_ * s_;
  return linearSrgbToColor(
    4.076_741_662_1 * lc - 3.307_711_591_3 * mc + 0.230_969_929_2 * sc,
    -1.268_438_004_6 * lc + 2.609_757_401_1 * mc - 0.341_319_396_5 * sc,
    -0.004_196_086_3 * lc - 0.703_418_614_7 * mc + 1.707_614_701 * sc
  );
}

// OKLCH to sRGB. L in 0..1, C in 0..~0.4 typical, H in degrees. Chroma past
// the sRGB gamut clamps per channel rather than producing NaN.
function oklchToRgb(L, C, H) {
  const hRad = (H * Math.PI) / 180;
  return oklabToRgb(L, C * Math.cos(hRad), C * Math.sin(hRad));
}

// CIE Lab to sRGB. CSS lab()/lch() use the D50 white point; the matrix below
// is the Bradford-adapted XYZ-D50 to linear-sRGB transform from CSS Color 4.
function labToRgb(L, a, b) {
  const kappa = 24_389 / 27,
    epsilon = 216 / 24_389;
  const fy = (L + 16) / 116,
    fx = fy + a / 500,
    fz = fy - b / 200;
  const invert = (t) =>
    t * t * t > epsilon ? t * t * t : (116 * t - 16) / kappa;
  const yr = L > kappa * epsilon ? ((L + 16) / 116) ** 3 : L / kappa;
  const Xn = 0.3457 / 0.3585,
    Zn = (1 - 0.3457 - 0.3585) / 0.3585;
  const x = invert(fx) * Xn,
    y = yr,
    z = invert(fz) * Zn;
  return linearSrgbToColor(
    3.134_135_956_995_870_7 * x -
      1.617_386_332_161_253_8 * y -
      0.490_661_946_008_353_2 * z,
    -0.978_795_502_912_089 * x +
      1.916_254_567_259_524 * y +
      0.033_442_731_161_319_5 * z,
    0.071_955_379_884_116_8 * x -
      0.228_976_826_415_832_2 * y +
      1.405_386_058_324_125 * z
  );
}

function lchToRgb(L, C, H) {
  const hRad = (H * Math.PI) / 180;
  return labToRgb(L, C * Math.cos(hRad), C * Math.sin(hRad));
}

// color(<space> c1 c2 c3) for the spaces that turn up in real stylesheets.
// `srgb` is what Chrome serializes most color-mix() results into, routinely
// with channels outside 0..1. Spaces we do not model return null so callers
// abstain instead of measuring against a color we invented.
function colorFunctionToRgb(space, c1, c2, c3) {
  switch (space) {
    case "srgb":
      return {
        a: 1,
        b: Math.round(clamp01(c3) * 255),
        g: Math.round(clamp01(c2) * 255),
        r: Math.round(clamp01(c1) * 255),
      };
    case "srgb-linear":
      return linearSrgbToColor(c1, c2, c3);
    case "display-p3": {
      const [R, G, B] = [
        decodeSrgbChannel(c1),
        decodeSrgbChannel(c2),
        decodeSrgbChannel(c3),
      ];
      return linearSrgbToColor(
        1.224_940_176_280_558_7 * R -
          0.224_940_464_681_750_6 * G +
          0.000_000_288_402_255_1 * B,
        -0.042_056_954_709_613_8 * R +
          1.042_057_166_129_863_4 * G -
          0.000_000_211_320_224_7 * B,
        -0.019_637_558_704_004_4 * R -
          0.078_636_077_217_475_5 * G +
          1.098_273_635_921_48 * B
      );
    }
    default:
      return null;
  }
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m0 = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return {
    a: 1,
    b: Math.round((b + m0) * 255),
    g: Math.round((g + m0) * 255),
    r: Math.round((r + m0) * 255),
  };
}

function hwbToRgb(h, w, bl) {
  if (w + bl >= 1) {
    const g = Math.round((w / (w + bl)) * 255);
    return { a: 1, b: g, g, r: g };
  }
  const base = hslToRgb(h, 1, 0.5);
  const mix = (c) => Math.round(((c / 255) * (1 - w - bl) + w) * 255);
  return { a: 1, b: mix(base.b), g: mix(base.g), r: mix(base.r) };
}

// Common CSS named colors — the handful that actually show up in generated
// UIs, not the full 148-name spec list. Includes the achromatic names so a
// named gray parses (and correctly reads as no-chroma) instead of being
// treated as an unknown color.
const CSS_NAMED_COLORS = {
  aqua: { b: 255, g: 255, r: 0 },
  black: { b: 0, g: 0, r: 0 },
  blue: { b: 255, g: 0, r: 0 },
  coral: { b: 80, g: 127, r: 255 },
  crimson: { b: 60, g: 20, r: 220 },
  cyan: { b: 255, g: 255, r: 0 },
  darkgray: { b: 169, g: 169, r: 169 },
  dimgray: { b: 105, g: 105, r: 105 },
  dodgerblue: { b: 255, g: 144, r: 30 },
  fuchsia: { b: 255, g: 0, r: 255 },
  gainsboro: { b: 220, g: 220, r: 220 },
  gold: { b: 0, g: 215, r: 255 },
  gray: { b: 128, g: 128, r: 128 },
  green: { b: 0, g: 128, r: 0 },
  grey: { b: 128, g: 128, r: 128 },
  hotpink: { b: 180, g: 105, r: 255 },
  indigo: { b: 130, g: 0, r: 75 },
  lightgray: { b: 211, g: 211, r: 211 },
  lime: { b: 0, g: 255, r: 0 },
  magenta: { b: 255, g: 0, r: 255 },
  maroon: { b: 0, g: 0, r: 128 },
  navy: { b: 128, g: 0, r: 0 },
  olive: { b: 0, g: 128, r: 128 },
  orange: { b: 0, g: 165, r: 255 },
  orchid: { b: 214, g: 112, r: 218 },
  pink: { b: 203, g: 192, r: 255 },
  purple: { b: 128, g: 0, r: 128 },
  rebeccapurple: { b: 153, g: 51, r: 102 },
  red: { b: 0, g: 0, r: 255 },
  salmon: { b: 114, g: 128, r: 250 },
  silver: { b: 192, g: 192, r: 192 },
  skyblue: { b: 235, g: 206, r: 135 },
  teal: { b: 128, g: 128, r: 0 },
  tomato: { b: 71, g: 99, r: 255 },
  turquoise: { b: 208, g: 224, r: 64 },
  violet: { b: 238, g: 130, r: 238 },
  white: { b: 255, g: 255, r: 255 },
  whitesmoke: { b: 245, g: 245, r: 245 },
  yellow: { b: 0, g: 255, r: 255 },
};

// Split a string on top-level commas (ignoring commas nested in parens).
function splitTopLevelCommas(str) {
  const parts = [];
  let depth = 0,
    start = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "(") {
      depth++;
    } else if (ch === ")") {
      depth = Math.max(0, depth - 1);
    } else if (ch === "," && depth === 0) {
      parts.push(str.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = str.slice(start).trim();
  if (tail) {
    parts.push(tail);
  }
  return parts;
}

// Evaluate a CSS color-mix() expression to {r,g,b,a}. Returns null when
// the expression can't be resolved (unresolved var(), unknown colors).
//
// Mixing is done with premultiplied alpha in sRGB regardless of the
// declared interpolation space. That is exact for the dominant generated-UI
// pattern — `color-mix(in oklab, <color> N%, transparent)` — where the
// result is simply <color> at alpha N% in ANY rectangular space, and a
// close-enough approximation for opaque-opaque mixes (the detector only
// consumes these values for contrast/chroma thresholds, not for display).
function parseColorMix(str) {
  const m = String(str)
    .trim()
    .match(/^color-mix\(/i);
  if (!m) {
    return null;
  }
  // Balanced-paren capture of the arguments.
  let depth = 0,
    end = -1;
  const open = str.indexOf("(");
  for (let i = open; i < str.length; i++) {
    if (str[i] === "(") {
      depth++;
    } else if (str[i] === ")") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) {
    return null;
  }
  const args = splitTopLevelCommas(str.slice(open + 1, end));
  if (args.length !== 3 || !/^in\s/i.test(args[0])) {
    return null;
  }

  const parseComponent = (component) => {
    // Percentage may lead or trail the color per spec.
    let pct = null;
    let colorStr = component;
    const trail = component.match(/\s+([\d.]+)%$/);
    const lead = component.match(/^([\d.]+)%\s+/);
    if (trail) {
      pct = Number.parseFloat(trail[1]);
      colorStr = component.slice(0, trail.index).trim();
    } else if (lead) {
      pct = Number.parseFloat(lead[1]);
      colorStr = component.slice(lead[0].length).trim();
    }
    let color;
    if (/^transparent$/i.test(colorStr)) {
      color = { a: 0, b: 0, g: 0, r: 0 };
    } else {
      color = parseAnyColor(colorStr);
    }
    if (!color) {
      return null;
    }
    return { color, pct };
  };

  const c1 = parseComponent(args[1]);
  const c2 = parseComponent(args[2]);
  if (!(c1 && c2)) {
    return null;
  }
  let p1 = c1.pct,
    p2 = c2.pct;
  if (p1 == null && p2 == null) {
    p1 = 50;
    p2 = 50;
  } else if (p1 == null) {
    p1 = 100 - p2;
  } else if (p2 == null) {
    p2 = 100 - p1;
  }
  const sum = p1 + p2;
  if (sum <= 0) {
    return null;
  }
  // Per spec: weights normalize to sum; when sum < 100 the result alpha is
  // additionally scaled by sum/100.
  const w1 = p1 / sum,
    w2 = p2 / sum;
  const alphaScale = sum < 100 ? sum / 100 : 1;
  const a1 = c1.color.a ?? 1,
    a2 = c2.color.a ?? 1;
  const a = (a1 * w1 + a2 * w2) * alphaScale;
  if (a <= 0) {
    return { a: 0, b: 0, g: 0, r: 0 };
  }
  const mix = (ch) =>
    Math.round(
      (c1.color[ch] * a1 * w1 + c2.color[ch] * a2 * w2) / (a1 * w1 + a2 * w2)
    );
  return { a: Math.min(1, a), b: mix("b"), g: mix("g"), r: mix("r") };
}

// Composite a translucent color over an opaque(ish) base (simple
// source-over in sRGB). Returns an opaque {r,g,b,a:1}.
function compositeColorOver(top, base) {
  const a = top.a ?? 1;
  return {
    a: 1,
    b: Math.round(top.b * a + base.b * (1 - a)),
    g: Math.round(top.g * a + base.g * (1 - a)),
    r: Math.round(top.r * a + base.r * (1 - a)),
  };
}

// A color() / lab() / lch() component: a bare number, a percentage against
// `scale`, or the `none` keyword (which resolves to zero for our purposes).
function parseColorComponent(token, scale = 1) {
  if (token == null) {
    return null;
  }
  const t = String(token).trim();
  if (/^none$/i.test(t)) {
    return 0;
  }
  const num = Number.parseFloat(t);
  if (!Number.isFinite(num)) {
    return null;
  }
  return t.endsWith("%") ? (num / 100) * scale : num;
}

function parseAlphaToken(token) {
  if (token == null) {
    return 1;
  }
  const t = String(token).trim();
  if (/^none$/i.test(t)) {
    return 1;
  }
  const num = Number.parseFloat(t);
  if (!Number.isFinite(num)) {
    return 1;
  }
  return t.endsWith("%") ? num / 100 : num;
}

// Extended color parser: rgb/rgba/hex/oklch/oklab/lch/lab/hsl/hwb/color()/
// color-mix/common named colors. Returns null on no match. Use this when the
// input might be any CSS color form; use plain parseRgb when you only expect
// computed rgb() values from real browsers.
function parseAnyColor(s) {
  if (!s || typeof s !== "string") {
    return null;
  }
  const str = s.trim();
  if (str === "transparent" || str === "currentcolor" || str === "inherit") {
    return null;
  }
  if (/^color-mix\(/i.test(str)) {
    return parseColorMix(str);
  }
  let m;
  m = str.match(
    /rgba?\(\s*(\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)(?:\s*[,/]\s*([\d.]+)(%)?)?\s*\)/
  );
  if (m) {
    const c = {
      a: 1,
      b: Math.round(+m[3]),
      g: Math.round(+m[2]),
      r: Math.round(+m[1]),
    };
    if (m[4] !== undefined) {
      c.a = m[5] === "%" ? Number.parseFloat(m[4]) / 100 : +m[4];
    }
    return c;
  }
  m = str.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    const h = m[1];
    if (h.length === 3 || h.length === 4) {
      return {
        a: h.length === 4 ? Number.parseInt(h[3] + h[3], 16) / 255 : 1,
        b: Number.parseInt(h[2] + h[2], 16),
        g: Number.parseInt(h[1] + h[1], 16),
        r: Number.parseInt(h[0] + h[0], 16),
      };
    }
    if (h.length === 6 || h.length === 8) {
      return {
        a: h.length === 8 ? Number.parseInt(h.slice(6, 8), 16) / 255 : 1,
        b: Number.parseInt(h.slice(4, 6), 16),
        g: Number.parseInt(h.slice(2, 4), 16),
        r: Number.parseInt(h.slice(0, 2), 16),
      };
    }
  }
  // OKLCH parser. Tailwind v4's CSS minifier squishes the space after
  // `%` ("21.5%.02 50"), so the separator between L and C may be absent.
  // Match L (with optional %), then C and H separated permissively.
  m = str.match(
    /oklch\(\s*([\d.]+)(%?)\s*[\s,]*\s*([\d.]+)\s*[\s,]+\s*([-\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+)(%)?)?\s*\)/i
  );
  if (m) {
    const Lnum = Number.parseFloat(m[1]);
    const L = m[2] === "%" ? Lnum / 100 : Lnum;
    const rgb = oklchToRgb(L, Number.parseFloat(m[3]), Number.parseFloat(m[4]));
    if (m[5] !== undefined) {
      const alpha = Number.parseFloat(m[5]);
      rgb.a = m[6] === "%" ? alpha / 100 : alpha;
    }
    return rgb;
  }
  // OKLAB — a/b are signed axes; percentages map 100% → 0.4.
  m = str.match(
    /oklab\(\s*([\d.]+)(%?)\s+(-?[\d.]+)(%?)\s+(-?[\d.]+)(%?)(?:\s*\/\s*([\d.]+)(%)?)?\s*\)/i
  );
  if (m) {
    const L =
      m[2] === "%" ? Number.parseFloat(m[1]) / 100 : Number.parseFloat(m[1]);
    const a =
      m[4] === "%" ? Number.parseFloat(m[3]) * 0.004 : Number.parseFloat(m[3]);
    const b =
      m[6] === "%" ? Number.parseFloat(m[5]) * 0.004 : Number.parseFloat(m[5]);
    const rgb = oklabToRgb(L, a, b);
    if (m[7] !== undefined) {
      const alpha = Number.parseFloat(m[7]);
      rgb.a = m[8] === "%" ? alpha / 100 : alpha;
    }
    return rgb;
  }
  // LCH / LAB — CIE, D50 white point. Chrome serializes lch(20% 5 60) as
  // `lch(20 5 60)`, so L arrives with or without its percent sign. In both
  // spaces L runs 0..100 and 100% means 100.
  m = str.match(
    /^lch\(\s*([\d.]+%?|none)\s+([\d.]+%?|none)\s+(-?[\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+%?|none))?\s*\)$/i
  );
  if (m) {
    const L = parseColorComponent(m[1], 100);
    const C = parseColorComponent(m[2], 150);
    const H = Number.parseFloat(m[3]);
    if (L == null || C == null || !Number.isFinite(H)) {
      return null;
    }
    const rgb = lchToRgb(L, C, H);
    rgb.a = parseAlphaToken(m[4]);
    return rgb;
  }
  m = str.match(
    /^lab\(\s*([\d.]+%?|none)\s+(-?[\d.]+%?|none)\s+(-?[\d.]+%?|none)(?:\s*\/\s*([\d.]+%?|none))?\s*\)$/i
  );
  if (m) {
    const L = parseColorComponent(m[1], 100);
    const a = parseColorComponent(m[2], 125);
    const b = parseColorComponent(m[3], 125);
    if (L == null || a == null || b == null) {
      return null;
    }
    const rgb = labToRgb(L, a, b);
    rgb.a = parseAlphaToken(m[4]);
    return rgb;
  }
  // color(<space> c1 c2 c3 [/ alpha]) — what Chrome hands back for most
  // color-mix() results and for any wide-gamut color an author wrote.
  m = str.match(
    /^color\(\s*([a-z0-9-]+)\s+(-?[\d.eE+-]+%?|none)\s+(-?[\d.eE+-]+%?|none)\s+(-?[\d.eE+-]+%?|none)(?:\s*\/\s*([\d.]+%?|none))?\s*\)$/i
  );
  if (m) {
    const c1 = parseColorComponent(m[2]);
    const c2 = parseColorComponent(m[3]);
    const c3 = parseColorComponent(m[4]);
    if (c1 == null || c2 == null || c3 == null) {
      return null;
    }
    const rgb = colorFunctionToRgb(m[1].toLowerCase(), c1, c2, c3);
    if (!rgb) {
      return null;
    }
    rgb.a = parseAlphaToken(m[5]);
    return rgb;
  }
  // HSL/HSLA — comma or space syntax, optional deg on hue.
  m = str.match(
    /hsla?\(\s*(-?[\d.]+)(?:deg)?\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%(?:\s*[,/]\s*([\d.]+)(%)?)?\s*\)/i
  );
  if (m) {
    const rgb = hslToRgb(
      Number.parseFloat(m[1]),
      Number.parseFloat(m[2]) / 100,
      Number.parseFloat(m[3]) / 100
    );
    if (m[4] !== undefined) {
      const alpha = Number.parseFloat(m[4]);
      rgb.a = m[5] === "%" ? alpha / 100 : alpha;
    }
    return rgb;
  }
  // HWB — hue whiteness% blackness%.
  m = str.match(
    /hwb\(\s*(-?[\d.]+)(?:deg)?\s+([\d.]+)%\s+([\d.]+)%(?:\s*\/\s*([\d.]+)(%)?)?\s*\)/i
  );
  if (m) {
    const rgb = hwbToRgb(
      Number.parseFloat(m[1]),
      Number.parseFloat(m[2]) / 100,
      Number.parseFloat(m[3]) / 100
    );
    if (m[4] !== undefined) {
      const alpha = Number.parseFloat(m[4]);
      rgb.a = m[5] === "%" ? alpha / 100 : alpha;
    }
    return rgb;
  }
  const named = CSS_NAMED_COLORS[str.toLowerCase()];
  if (named) {
    return { ...named, a: 1 };
  }
  return null;
}

// True when a computed background-color string names no paint at all. Used to
// tell "this layer is see-through" (walk on to the ancestor) apart from "this
// layer has a color we could not read" (stop and abstain).
//
// `inherit` belongs here even though it is not literally see-through: it means
// "paint with the parent's background-color", and walking on to the parent IS
// that resolution. Real browsers resolve the keyword before getComputedStyle
// output; only jsdom's partial cascade hands it through verbatim, and treating
// it as unreadable would make the walk abstain on a surface it can know.
// (`currentcolor` is NOT here — it is real paint in the element's own text
// color; resolveBackgroundInfo substitutes the computed color for it.)
function isNoPaintColorValue(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  if (!v) {
    return true;
  }
  return (
    v === "transparent" ||
    v === "none" ||
    v === "initial" ||
    v === "inherit" ||
    v === "unset" ||
    v === "revert" ||
    v === "revert-layer"
  );
}

export {
  CSS_NAMED_COLORS,
  colorFunctionToRgb,
  colorToHex,
  compositeColorOver,
  contrastRatio,
  extractColorFunctionTokens,
  getHue,
  hasChroma,
  hslToRgb,
  hwbToRgb,
  isNeutralColor,
  isNoPaintColorValue,
  labToRgb,
  lchToRgb,
  oklabToRgb,
  oklchToRgb,
  parseAnyColor,
  parseColorMix,
  parseGradientColors,
  parseRgb,
  relativeLuminance,
  splitTopLevelCommas,
};
