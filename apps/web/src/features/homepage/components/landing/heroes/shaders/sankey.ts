const LANE = 0.015;

export const SANKEY_BANDS = [
  { label: "Dark mode", strands: 5, votes: 184, y: 0.505 },
  { label: "CSV export", strands: 4, votes: 121, y: 0.425 },
  { label: "Slack alerts", strands: 3, votes: 76, y: 0.358 },
  { label: "Public API", strands: 2, votes: 43, y: 0.305 },
] as const;

const STRAND_ENTRIES = [
  0.6, 0.18, 0.44, 0.05, 0.55, 0.3, 0.12, 0.5, 0.24, 0.62, 0.38, 0.08, 0.47,
  0.2,
] as const;
const STRAND_BAND = [0, 1, 0, 2, 1, 0, 3, 2, 1, 0, 2, 3, 0, 1] as const;

const laneCounters = SANKEY_BANDS.map(() => 0);
const strands = STRAND_ENTRIES.map((entry, index) => {
  const band = SANKEY_BANDS[STRAND_BAND[index]];
  const lane = laneCounters[STRAND_BAND[index]]++;
  return {
    entry,
    seed: ((index * 47) % 13) / 13,
    target: band.y + (lane - (band.strands - 1) / 2) * LANE,
  };
});

const floats = (values: readonly number[]) =>
  values.map((v) => v.toFixed(4)).join(", ");

const entryList = floats(strands.map((s) => s.entry));
const targetList = floats(strands.map((s) => s.target));
const seedList = floats(strands.map((s) => s.seed));

const comets = [0, 3, 6, 9, 12].map((i) => strands[i]);
const cometEntryList = floats(comets.map((s) => s.entry));
const cometTargetList = floats(comets.map((s) => s.target));

export const SANKEY_SHADER = /* wgsl */ `
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
  let calm = 1.0 - u.input.x * 0.55;

  let joinT = smoothstep(0.1, 0.72, x);
  let chaosEnv = 1.0 - smoothstep(0.08, 0.66, x);

  var entries = array<f32, 14>(${entryList});
  var targets = array<f32, 14>(${targetList});
  var seeds = array<f32, 14>(${seedList});
  var cometEntries = array<f32, 5>(${cometEntryList});
  var cometTargets = array<f32, 5>(${cometTargetList});

  var alpha = 0.0;
  var heat = 0.0;

  for (var i = 0; i < 14; i = i + 1) {
    let fi = f32(i);
    let seed = seeds[i];

    let n = fbm(vec2(x * 5.0 + seed * 13.0, t * 0.22 + seed * 3.0), 3) - 0.5;
    let breath = 0.004 * sin(t * 0.7 + seed * 11.0);
    let wiggle = n * 0.3 * chaosEnv * calm;
    let y0 = mix(entries[i] + wiggle, targets[i] + breath, joinT);

    let d = input.uv.y - y0;

    let away = (vec2(x, y0) - u.pointer.zw) * aspect;
    let near = exp(-dot(away, away) * 40.0);
    let width = 0.0026 + 0.0045 * joinT;
    let flow = 0.6 + 0.55 * valueNoise(vec2(x * 24.0 - t * 1.9, fi * 6.7));
    alpha = alpha + ribbon(d, width) * flow * 0.62;
    heat = heat + ribbon(d, width) * near * 0.35;
    alpha = alpha + ribbon(d, 0.014) * 0.09 * joinT;
  }

  for (var j = 0; j < 3; j = j + 1) {
    let fj = f32(j);
    let s = fract(t * 0.09 + fj * 0.34);
    let xc = s * 1.05;
    let joinC = smoothstep(0.1, 0.72, xc);
    let yc = mix(cometEntries[j], cometTargets[j], joinC)
      + 0.01 * sin(xc * 7.0 + t * 0.5 + fj * 3.1);
    let cd = length((input.uv - vec2(xc, yc)) * aspect);
    heat = heat + exp(-cd * cd * 1700.0) * smoothstep(0.0, 0.1, s) * 0.8;
  }

  let pd = length((input.uv - u.pointer.zw) * aspect);
  heat = heat + exp(-pd * pd * 500.0) * u.input.x * 0.9;

  alpha = alpha * mix(0.5, 0.42, dark) + heat * mix(0.4, 0.34, dark);
  alpha = alpha * smoothstep(0.0, 0.05, x);
  alpha = alpha * (1.0 - smoothstep(0.86, 0.98, x) * 0.55);
  alpha = alpha * intro + grain(input.uv, t) * 0.012;
  alpha = clamp(alpha, 0.0, 1.0);

  let body = mix(vec3(0.30, 0.32, 0.15), vec3(0.64, 0.68, 0.44), dark);
  let bright = mix(vec3(0.47, 0.48, 0.23), vec3(0.96, 0.97, 0.82), dark);
  let tint = mix(body, bright, clamp(heat * 1.4, 0.0, 1.0));
  return vec4(tint * alpha, alpha);
}
`;
