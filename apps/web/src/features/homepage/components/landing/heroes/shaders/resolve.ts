export const RESOLVE_BASE_Y = 0.44;

export const RESOLVE_TICKS = [
  { label: "v3.0", x: 0.7 },
  { label: "v3.1", x: 0.81 },
  { label: "v3.2", x: 0.92 },
] as const;

const tickXs = RESOLVE_TICKS.map((tick) => tick.x.toFixed(3)).join(", ");

export const RESOLVE_SHADER = /* wgsl */ `
const BASE_Y = ${RESOLVE_BASE_Y.toFixed(3)};

fn ribbon(d : f32, width : f32) -> f32 {
  return width * width / (width * width + d * d * 2.4);
}

@fragment
fn fs(input : VOut) -> @location(0) vec4<f32> {
  let t = u.frame.x + u.input.w * 20.0;
  let dark = u.frame.z;
  let intro = u.frame.w;
  let x = input.uv.x;
  let aspect = vec2(u.frame.y, 1.0);

  let resolveX = clamp(mix(0.46, u.pointer.z, 0.4), 0.32, 0.6);
  let calm = 1.0 - 0.85 * u.input.x
    * exp(-pow((x - u.pointer.z) * u.frame.y, 2.0) * 9.0);
  let ampEnv = (smoothstep(resolveX + 0.04, resolveX - 0.42, x) * 0.16 + 0.004) * calm;

  var alpha = 0.0;
  var heat = 0.0;

  for (var j = 0; j < 7; j = j + 1) {
    let fj = f32(j);
    let wobble = fbm(vec2(x * 5.5 + fj * 13.7, t * 0.24 + fj * 0.6), 3) - 0.5;
    let y = BASE_Y + ampEnv * wobble * (0.5 + fj * 0.24)
      + 0.006 * sin(x * 9.0 + t * 0.5 + fj);
    let d = input.uv.y - y;
    let core = step(fj, 0.5);
    alpha = alpha + ribbon(d, mix(0.0018, 0.0034, core)) * mix(0.16, 0.55, core);

    if (j == 0) {
      let clean = smoothstep(resolveX - 0.02, resolveX + 0.1, x);
      let pulseX = resolveX + fract(t * 0.1) * (1.04 - resolveX);
      let pd = (x - pulseX) * u.frame.y;
      heat = heat + ribbon(d, 0.005) * exp(-pd * pd * 26.0) * clean;
    }
  }

  var ticks = array<f32, 3>(${tickXs});
  for (var k = 0; k < 3; k = k + 1) {
    let tickPos = vec2(ticks[k], BASE_Y + 0.006 * sin(ticks[k] * 9.0 + t * 0.5));
    let td = length((input.uv - tickPos) * aspect);
    let ring = exp(-pow((td - 0.012), 2.0) * 30000.0);
    let bump = 0.5 + 0.5 * sin(t * 0.8 + f32(k) * 2.1);
    heat = heat + ring * (0.5 + 0.4 * bump);
  }

  alpha = alpha * mix(0.55, 0.5, dark) + heat * mix(0.5, 0.42, dark);
  alpha = alpha * smoothstep(0.0, 0.04, x) * smoothstep(1.02, 0.99, x) * intro
    + grain(input.uv, t) * 0.012;
  alpha = clamp(alpha, 0.0, 1.0);

  let body = mix(vec3(0.30, 0.32, 0.15), vec3(0.64, 0.68, 0.44), dark);
  let bright = mix(vec3(0.20, 0.22, 0.08), vec3(0.96, 0.97, 0.82), dark);
  let tint = mix(body, bright, clamp(heat * 1.3, 0.0, 1.0));
  return vec4(tint * alpha, alpha);
}
`;
