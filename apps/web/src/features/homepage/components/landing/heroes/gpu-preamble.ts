export const FRAME_TIME = 0;
export const FRAME_ASPECT = 1;
export const FRAME_DARK = 2;
export const FRAME_INTRO = 3;
export const POINTER_X = 4;
export const POINTER_Y = 5;
export const POINTER_SMOOTH_X = 6;
export const POINTER_SMOOTH_Y = 7;
export const INPUT_PRESS = 8;
export const INPUT_SCROLL = 9;
export const INPUT_SPEED = 10;
export const INPUT_SEED = 11;
export const UNIFORM_FLOATS = 12;

export const GPU_PREAMBLE = /* wgsl */ `
struct Uniforms {
  frame : vec4<f32>,
  pointer : vec4<f32>,
  input : vec4<f32>,
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

fn hash22(p : vec2<f32>) -> vec2<f32> {
  let a = hash21(p);
  let b = hash21(p + vec2(19.19, 7.71));
  return vec2(a, b);
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

fn fbm(start : vec2<f32>, octaves : i32) -> f32 {
  let rot = mat2x2<f32>(0.8, 0.6, -0.6, 0.8);
  var p = start;
  var sum = 0.0;
  var amp = 0.55;
  for (var i = 0; i < octaves; i = i + 1) {
    sum = sum + amp * valueNoise(p);
    p = rot * p * 2.17;
    amp = amp * 0.48;
  }
  return sum;
}

fn smin(a : f32, b : f32, k : f32) -> f32 {
  let h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

fn grain(uv : vec2<f32>, t : f32) -> f32 {
  return hash21(uv * vec2(1917.0, 1131.0) + vec2(t)) - 0.5;
}

fn stage(uv : vec2<f32>) -> vec2<f32> {
  return vec2((uv.x - 0.5) * u.frame.y, uv.y - 0.5);
}
`;
