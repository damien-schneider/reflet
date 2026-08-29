export const STAGE_FOCUS_Y = 0.42;

const STAGE_STREAMS = [
  { entry: 0.08, side: 0 },
  { entry: 0.22, side: 0 },
  { entry: 0.38, side: 0 },
  { entry: 0.55, side: 0 },
  { entry: 0.14, side: 1 },
  { entry: 0.3, side: 1 },
  { entry: 0.46, side: 1 },
  { entry: 0.6, side: 1 },
] as const;

const entryList = STAGE_STREAMS.map((s) => s.entry.toFixed(3)).join(", ");
const sideList = STAGE_STREAMS.map((s) => s.side.toFixed(1)).join(", ");

export const STAGE_SHADER = /* wgsl */ `
const FOCUS_Y = ${STAGE_FOCUS_Y.toFixed(3)};

fn streamPath(entry : f32, index : f32, p : f32, t : f32) -> f32 {
  let wiggle = 0.02 * sin(p * 7.0 + index * 5.3 + t * 0.5);
  let pull = smoothstep(0.06, 0.94, p);
  return mix(entry + wiggle, FOCUS_Y + 0.012 * sin(t * 0.6 + index * 2.1), pull);
}

fn ribbon(d : f32, width : f32) -> f32 {
  return width * width / (width * width + d * d * 2.4);
}

@fragment
fn fs(input : VOut) -> @location(0) vec4<f32> {
  let t = u.frame.x + u.input.w * 30.0;
  let dark = u.frame.z;
  let intro = u.frame.w;
  let x = input.uv.x;
  let aspect = vec2(u.frame.y, 1.0);

  var entries = array<f32, 8>(${entryList});
  var sides = array<f32, 8>(${sideList});

  var alpha = 0.0;
  var heat = 0.0;

  for (var i = 0; i < 8; i = i + 1) {
    let fi = f32(i);
    let side = sides[i];
    let m = mix(x, 1.0 - x, side);
    let p = m * 2.0;

    let y0 = streamPath(entries[i], fi, p, t);
    let away = (vec2(x, y0) - u.pointer.zw) * aspect;
    let push = exp(-dot(away, away) * 26.0);
    let y = y0 + 0.04 * push * sign(y0 - u.pointer.w);
    let d = input.uv.y - y;

    let alive = smoothstep(0.0, 0.1, m) * (1.0 - smoothstep(0.8, 0.98, p));
    let flow = 0.65 + 0.55 * valueNoise(vec2(m * 22.0 - t * 2.0, fi * 7.1));
    alpha = alpha + ribbon(d, 0.0034) * alive * flow * 0.5;

    let s = fract(t * 0.11 + fi * 0.37);
    let mc = s * 0.5;
    let xc = mix(mc, 1.0 - mc, side);
    let yc = streamPath(entries[i], fi, s, t);
    let cd = length((input.uv - vec2(xc, yc)) * aspect);
    heat = heat + exp(-cd * cd * 900.0)
      * smoothstep(0.0, 0.12, s) * (1.0 - smoothstep(0.85, 1.0, s));
  }

  let fd = length((input.uv - vec2(0.5, FOCUS_Y)) * aspect);
  heat = heat + exp(-fd * fd * 160.0) * (0.3 + 0.12 * sin(t * 1.2));

  let pd = length((input.uv - u.pointer.zw) * aspect);
  heat = heat + exp(-pd * pd * 500.0) * u.input.x * 0.9;

  alpha = alpha * mix(0.5, 0.42, dark) + heat * mix(0.4, 0.34, dark);
  alpha = alpha * intro + grain(input.uv, t) * 0.012;
  alpha = clamp(alpha, 0.0, 1.0);

  let body = mix(vec3(0.30, 0.32, 0.15), vec3(0.64, 0.68, 0.44), dark);
  let bright = mix(vec3(0.47, 0.48, 0.23), vec3(0.96, 0.97, 0.82), dark);
  let tint = mix(body, bright, clamp(heat * 1.4, 0.0, 1.0));
  return vec4(tint * alpha, alpha);
}
`;
