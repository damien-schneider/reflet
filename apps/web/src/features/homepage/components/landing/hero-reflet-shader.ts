export const MAX_RIPPLES = 10;

export const FRAME_TIME = 0;
export const FRAME_ASPECT = 1;
export const FRAME_DARK = 2;
export const FRAME_INTRO = 3;
export const FRAME_FLOATS = 4;
export const UNIFORM_FLOATS = FRAME_FLOATS + MAX_RIPPLES * 4;

export const REFLET_SHADER = /* wgsl */ `
const ZOOM = 3.0;
const RIPPLE_LIFE = 4.2;
const STRETCH = 2.7;

struct Uniforms {
  frame : vec4<f32>,
  ripples : array<vec4<f32>, ${MAX_RIPPLES}>,
}

@group(0) @binding(0) var<uniform> u : Uniforms;

struct VOut {
  @builtin(position) pos : vec4<f32>,
  @location(0) uv : vec2<f32>,
}

@vertex
fn vs(@builtin(vertex_index) index : u32) -> VOut {
  var corners = array<vec2<f32>, 3>(
    vec2(-1.0, -3.0),
    vec2(3.0, 1.0),
    vec2(-1.0, 1.0)
  );
  var output : VOut;
  let corner = corners[index];
  output.pos = vec4(corner, 0.0, 1.0);
  output.uv = corner * 0.5 + vec2(0.5);
  return output;
}

fn hash21(p : vec2<f32>) -> f32 {
  var q = fract(p * vec2(123.34, 345.45));
  q = q + dot(q, q + 34.345);
  return fract(q.x * q.y);
}

fn valueNoise(p : vec2<f32>) -> f32 {
  let cell = floor(p);
  let f = fract(p);
  let s = f * f * (3.0 - 2.0 * f);
  let a = hash21(cell);
  let b = hash21(cell + vec2(1.0, 0.0));
  let c = hash21(cell + vec2(0.0, 1.0));
  let d = hash21(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, s.x), mix(c, d, s.x), s.y);
}

fn fbm(start : vec2<f32>) -> f32 {
  let rot = mat2x2<f32>(0.8, 0.6, -0.6, 0.8);
  var p = start;
  var sum = 0.0;
  var amp = 0.55;
  for (var i = 0; i < 3; i = i + 1) {
    sum = sum + amp * valueNoise(p);
    p = rot * p * 2.17;
    amp = amp * 0.48;
  }
  return sum;
}

fn rippleHeight(p : vec2<f32>, t : f32, aspect : f32) -> f32 {
  var h = 0.0;
  for (var i = 0; i < ${MAX_RIPPLES}; i = i + 1) {
    let r = u.ripples[i];
    if (r.w <= 0.0) { continue; }
    let age = t - r.z;
    if (age <= 0.0 || age >= RIPPLE_LIFE) { continue; }
    let center = vec2(r.x * aspect, r.y) * ZOOM;
    let d = distance(p, center);
    let front = age * 1.15;
    let band = (d - front) * 2.6;
    let envelope = exp(-band * band) * exp(-age * 1.25) * exp(-d * 0.32);
    h = h + r.w * envelope * sin((d - front) * 22.0);
  }
  return h;
}

fn surfaceHeight(p : vec2<f32>, t : f32) -> f32 {
  let q = vec2(p.x, p.y * STRETCH);
  let drift = vec2(t * 0.05, t * 0.016);
  let warp = vec2(
    fbm(q * 0.7 + drift),
    fbm(q * 0.7 + vec2(4.1, 1.9) - drift)
  );
  let swell = fbm(q + 1.5 * warp + drift * 1.4);
  return swell + rippleHeight(p, t, u.frame.y);
}

@fragment
fn fs(input : VOut) -> @location(0) vec4<f32> {
  let t = u.frame.x;
  let aspect = u.frame.y;
  let darkMix = u.frame.z;
  let intro = u.frame.w;

  let p = vec2(input.uv.x * aspect, input.uv.y) * ZOOM;
  let eps = 0.035;
  let h = surfaceHeight(p, t);
  let hx = surfaceHeight(p + vec2(eps, 0.0), t);
  let hy = surfaceHeight(p + vec2(0.0, eps), t);
  let normal = normalize(vec3((h - hx) / eps, (h - hy) / eps, 2.4));

  let lightDir = normalize(vec3(-0.35, 0.72, 0.6));
  let halfway = normalize(lightDir + vec3(0.0, 0.0, 1.0));
  let facing = max(dot(normal, halfway), 0.0);
  let sheen = pow(facing, 26.0);
  let crest = pow(facing, 90.0);
  let glint = pow(facing, 300.0);

  let columnX = (input.uv.x - 0.42) + normal.x * 0.18;
  let column = exp(-columnX * columnX * 5.0);

  let centered = (input.uv - vec2(0.44, 0.6)) * vec2(aspect * 0.42, 1.15);
  let vignette = smoothstep(1.1, 0.1, length(centered));

  let deepInk = vec3(0.30, 0.32, 0.16);
  let lightGlow = vec3(0.86, 0.87, 0.68);
  let body = mix(deepInk, lightGlow, darkMix);
  let flare = mix(vec3(0.42, 0.40, 0.19), vec3(0.97, 0.96, 0.80), darkMix);

  var alpha = sheen * mix(0.055, 0.075, darkMix)
    + crest * mix(0.11, 0.14, darkMix) * (0.4 + 0.6 * column)
    + glint * mix(0.26, 0.30, darkMix) * (0.25 + 0.75 * column);
  alpha = alpha * vignette * intro;
  alpha = alpha + (hash21(input.uv * vec2(1917.0, 1131.0) + vec2(t)) - 0.5) * 0.010;
  alpha = clamp(alpha, 0.0, 1.0);

  let tint = mix(body, flare, clamp(glint * 2.5, 0.0, 1.0));
  return vec4(tint * alpha, alpha);
}
`;
