export const RELAY_STOPS = [0.22, 0.5, 0.78] as const;
export const RELAY_LINE_Y = 0.38;

const stopList = RELAY_STOPS.map((s) => s.toFixed(3)).join(", ");

export const RELAY_SHADER = /* wgsl */ `
const LINE_Y = ${RELAY_LINE_Y.toFixed(3)};

fn lineY(x : f32, t : f32) -> f32 {
  return LINE_Y + 0.014 * sin(x * 5.0 + t * 0.4);
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

  var stops = array<f32, 3>(${stopList});

  let dstop = min(
    min(abs(x - stops[0]), abs(x - stops[1])),
    abs(x - stops[2])
  );
  let spread = smoothstep(0.02, 0.15, dstop);

  let base = lineY(x, t);
  let away = (vec2(x, base) - u.pointer.zw) * aspect;
  let push = exp(-dot(away, away) * 26.0);
  let yMain = base + 0.04 * push * sign(base - u.pointer.w);

  var alpha = 0.0;
  var heat = 0.0;

  let flow = 0.7 + 0.5 * valueNoise(vec2(x * 20.0 - t * 2.4, 17.3));
  alpha = alpha + ribbon(input.uv.y - yMain, 0.0042) * flow * 0.8;

  for (var k = 0; k < 2; k = k + 1) {
    let dir = f32(k) * 2.0 - 1.0;
    let offset = dir * spread * (0.034 + 0.006 * sin(t * 0.5 + dir * 3.0));
    let ye = yMain + offset;
    let flowE = 0.6 + 0.5 * valueNoise(vec2(x * 26.0 - t * 1.8, dir * 9.1));
    alpha = alpha + ribbon(input.uv.y - ye, 0.0026) * flowE * 0.45;
  }

  for (var j = 0; j < 4; j = j + 1) {
    let fj = f32(j);
    let s = fract(t * 0.07 + fj * 0.26);
    let xc = s * 1.12 - 0.06;
    let comet = vec2(xc, lineY(xc, t));
    let cd = length((input.uv - comet) * aspect);
    heat = heat + exp(-cd * cd * 800.0) * (1.0 + u.input.x * 1.2);
  }

  for (var n = 0; n < 3; n = n + 1) {
    let sx = stops[n];
    let nd = length((input.uv - vec2(sx, lineY(sx, t))) * aspect);
    heat = heat + exp(-nd * nd * 600.0) * 0.35 * (0.6 + 0.4 * sin(t * 1.1 + sx * 20.0));
  }

  let pd = length((input.uv - u.pointer.zw) * aspect);
  heat = heat + exp(-pd * pd * 500.0) * u.input.x * 0.9;

  alpha = alpha * mix(0.5, 0.42, dark) + heat * mix(0.4, 0.34, dark);
  alpha = alpha * smoothstep(0.0, 0.04, x) * smoothstep(1.0, 0.96, x);
  alpha = alpha * intro + grain(input.uv, t) * 0.012;
  alpha = clamp(alpha, 0.0, 1.0);

  let body = mix(vec3(0.30, 0.32, 0.15), vec3(0.64, 0.68, 0.44), dark);
  let bright = mix(vec3(0.47, 0.48, 0.23), vec3(0.96, 0.97, 0.82), dark);
  let tint = mix(body, bright, clamp(heat * 1.4, 0.0, 1.0));
  return vec4(tint * alpha, alpha);
}
`;
