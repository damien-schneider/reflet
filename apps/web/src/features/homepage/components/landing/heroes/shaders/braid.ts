export const BRAID_ENTRIES = [
  { label: "Notify my server on status change", y: 0.78 },
  { label: "Any way to subscribe to updates?", y: 0.62 },
  { label: "Webhooks for transitions?", y: 0.5 },
  { label: "Push status to Slack", y: 0.34 },
  { label: "Let me watch a request", y: 0.2 },
] as const;

export const BRAID_MAIN_Y = 0.48;

const entryYs = BRAID_ENTRIES.map((e) => e.y.toFixed(3)).join(", ");

export const BRAID_SHADER = /* wgsl */ `
const MAIN_Y = ${BRAID_MAIN_Y.toFixed(3)};

fn braidAmp(x : f32) -> f32 {
  return 0.034 * smoothstep(0.2, 0.44, x);
}

fn strandY(entry : f32, index : f32, x : f32, t : f32, spread : f32) -> f32 {
  let joined = smoothstep(0.06 + index * 0.04, 0.3 + index * 0.03, x);
  let phase = index * 2.51 + t * 0.3;
  let weave = sin(x * 21.0 + phase) + 0.35 * sin(x * 43.0 + phase * 1.7);
  let braided = MAIN_Y + braidAmp(x) * spread * weave;
  let loose = entry + 0.015 * sin(x * 7.0 + index * 5.0 + t * 0.4);
  return mix(loose, braided, joined);
}

fn ribbon(d : f32, width : f32) -> f32 {
  return width * width / (width * width + d * d * 2.4);
}

@fragment
fn fs(input : VOut) -> @location(0) vec4<f32> {
  let t = u.frame.x + u.input.w * 25.0;
  let dark = u.frame.z;
  let intro = u.frame.w;
  let x = input.uv.x;
  let aspect = vec2(u.frame.y, 1.0);

  var entries = array<f32, 5>(${entryYs});

  let toLine = (vec2(x, MAIN_Y) - u.pointer.zw) * aspect;
  let spread = 1.0 + 1.7 * exp(-dot(toLine, toLine) * 14.0);

  let sent = 1.0 - u.input.x;
  let pulseX = u.pointer.z + sent * 0.45;

  var alpha = 0.0;
  var heat = 0.0;

  for (var i = 0; i < 5; i = i + 1) {
    let fi = f32(i);
    let y = strandY(entries[i], fi, x, t, spread);
    let d = input.uv.y - y;
    let tone = 0.6 + 0.4 * hash21(vec2(fi, 3.7));
    let flow = 0.7 + 0.5 * valueNoise(vec2(x * 22.0 - t * 1.6, fi * 9.1));
    alpha = alpha + ribbon(d, 0.003) * tone * flow * 0.42;

    let s = fract(t * 0.09 + fi * 0.41);
    let cometX = s * 1.08;
    let comet = vec2(cometX, strandY(entries[i], fi, cometX, t, spread));
    let cd = length((input.uv - comet) * aspect);
    heat = heat + exp(-cd * cd * 1000.0) * smoothstep(0.0, 0.1, s);

    let pd = abs(x - pulseX);
    heat = heat + ribbon(d, 0.004) * exp(-pd * pd * 300.0) * u.input.x * 0.9;
  }

  alpha = alpha * mix(0.52, 0.45, dark) + heat * mix(0.42, 0.36, dark);
  alpha = alpha * smoothstep(0.0, 0.05, x) * smoothstep(1.02, 0.99, x) * intro
    + grain(input.uv, t) * 0.012;
  alpha = clamp(alpha, 0.0, 1.0);

  let body = mix(vec3(0.30, 0.32, 0.15), vec3(0.64, 0.68, 0.44), dark);
  let bright = mix(vec3(0.20, 0.22, 0.08), vec3(0.96, 0.97, 0.82), dark);
  let tint = mix(body, bright, clamp(heat * 1.3, 0.0, 1.0));
  return vec4(tint * alpha, alpha);
}
`;
