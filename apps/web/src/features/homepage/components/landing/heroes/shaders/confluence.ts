export const CONFLUENCE_SOURCES = [
  { label: "Widget", mergeX: 0.34, y: 0.84 },
  { label: "Email", mergeX: 0.46, y: 0.68 },
  { label: "Slack", mergeX: 0.55, y: 0.56 },
  { label: "API", mergeX: 0.64, y: 0.28 },
  { label: "Interviews", mergeX: 0.73, y: 0.14 },
] as const;

export const CONFLUENCE_MAIN_Y = 0.42;

const entryYs = CONFLUENCE_SOURCES.map((s) => s.y.toFixed(3)).join(", ");
const mergeXs = CONFLUENCE_SOURCES.map((s) => s.mergeX.toFixed(3)).join(", ");

export const CONFLUENCE_SHADER = /* wgsl */ `
const MAIN_Y = ${CONFLUENCE_MAIN_Y.toFixed(3)};

fn mainY(x : f32, t : f32) -> f32 {
  return MAIN_Y + 0.025 * sin(x * 4.2 + t * 0.4);
}

fn streamY(entry : f32, mergeX : f32, index : f32, x : f32, t : f32) -> f32 {
  let wiggle = 0.018 * sin(x * 8.5 + index * 5.1 + t * 0.5);
  let joined = smoothstep(mergeX - 0.3, mergeX, x);
  return mix(entry + wiggle, mainY(x, t), joined);
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

  var entries = array<f32, 5>(${entryYs});
  var merges = array<f32, 5>(${mergeXs});

  var alpha = 0.0;
  var heat = 0.0;
  var joined = 0.0;

  for (var i = 0; i < 5; i = i + 1) {
    let fi = f32(i);
    let entry = entries[i];
    let mergeX = merges[i];
    joined = joined + smoothstep(mergeX - 0.04, mergeX, x);

    let y0 = streamY(entry, mergeX, fi, x, t);
    let away = (vec2(x, y0) - u.pointer.zw) * aspect;
    let push = exp(-dot(away, away) * 26.0);
    let y = y0 + 0.045 * push * sign(y0 - u.pointer.w);
    let d = input.uv.y - y;
    let alive = 1.0 - smoothstep(mergeX, mergeX + 0.05, x);
    let flow = 0.65 + 0.55 * valueNoise(vec2(x * 24.0 - t * 2.1, fi * 7.3));
    alpha = alpha + ribbon(d, 0.0035) * alive * flow * 0.5;

    let s = fract(t * 0.13 + fi * 0.37);
    let cometX = s * (mergeX + 0.06);
    let comet = vec2(cometX, streamY(entry, mergeX, fi, cometX, t));
    let cd = length((input.uv - comet) * aspect);
    heat = heat + exp(-cd * cd * 900.0) * smoothstep(0.0, 0.12, s);
  }

  let my = mainY(x, t);
  let md = input.uv.y - my;
  let mainWidth = 0.0035 + joined * 0.0025;
  let mainFlow = 0.7 + 0.5 * valueNoise(vec2(x * 20.0 - t * 2.6, 31.7));
  alpha = alpha + ribbon(md, mainWidth) * mainFlow * (0.4 + joined * 0.1);

  for (var j = 0; j < 3; j = j + 1) {
    let fj = f32(j);
    let s = fract(t * 0.1 + fj * 0.33);
    let cometX = s * 1.1;
    let comet = vec2(cometX, mainY(cometX, t));
    let cd = length((input.uv - comet) * aspect);
    heat = heat + exp(-cd * cd * 700.0);
  }

  let pd = length((input.uv - u.pointer.zw) * aspect);
  heat = heat + exp(-pd * pd * 500.0) * u.input.x * 0.9;

  alpha = alpha * mix(0.5, 0.42, dark) + heat * mix(0.4, 0.34, dark);
  alpha = alpha * smoothstep(0.0, 0.06, x) * intro + grain(input.uv, t) * 0.012;
  alpha = clamp(alpha, 0.0, 1.0);

  let body = mix(vec3(0.30, 0.32, 0.15), vec3(0.64, 0.68, 0.44), dark);
  let bright = mix(vec3(0.47, 0.48, 0.23), vec3(0.96, 0.97, 0.82), dark);
  let tint = mix(body, bright, clamp(heat * 1.4, 0.0, 1.0));
  return vec4(tint * alpha, alpha);
}
`;
