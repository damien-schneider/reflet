export const MOSAIC_CORE = { x: 0.54, y: 0.47 } as const;

export const MOSAIC_CLUSTERS = [
  {
    label: "Dark mode",
    meta: "184 votes · 31 reports",
    sigma: 0.075,
    weight: 1,
    x: 0.52,
    y: 0.76,
  },
  {
    label: "CSV export",
    meta: "121 votes · 22 reports",
    sigma: 0.066,
    weight: 0.85,
    x: 0.72,
    y: 0.72,
  },
  {
    label: "Slack alerts",
    meta: "76 votes · 14 reports",
    sigma: 0.06,
    weight: 0.7,
    x: 0.8,
    y: 0.48,
  },
  {
    label: "Mobile app",
    meta: "64 votes · 19 reports",
    sigma: 0.064,
    weight: 0.8,
    x: 0.72,
    y: 0.24,
  },
  {
    label: "Bulk edit",
    meta: "38 votes · 11 reports",
    sigma: 0.05,
    weight: 0.65,
    x: 0.52,
    y: 0.22,
  },
  {
    label: "Public API",
    meta: "43 votes · 9 reports",
    sigma: 0.052,
    weight: 0.6,
    x: 0.33,
    y: 0.24,
  },
  {
    label: "SSO login",
    meta: "29 votes · 7 reports",
    sigma: 0.048,
    weight: 0.5,
    x: 0.26,
    y: 0.55,
  },
  {
    label: "Webhooks",
    meta: "21 votes · 5 reports",
    sigma: 0.05,
    weight: 0.55,
    x: 0.34,
    y: 0.74,
  },
] as const;

const clusterList = MOSAIC_CLUSTERS.map(
  (c) =>
    `vec4(${c.x.toFixed(3)}, ${c.y.toFixed(3)}, ${c.sigma.toFixed(3)}, ${c.weight.toFixed(2)})`
).join(",\n    ");

export const MOSAIC_SHADER = /* wgsl */ `
const CELL = 0.018;
const CORE = vec2(${MOSAIC_CORE.x.toFixed(3)}, ${MOSAIC_CORE.y.toFixed(3)});

@fragment
fn fs(input : VOut) -> @location(0) vec4<f32> {
  let t = u.frame.x + u.input.w * 30.0;
  let dark = u.frame.z;
  let intro = u.frame.w;
  let a = u.frame.y;
  let aspect = vec2(a, 1.0);
  let cuv = input.uv * aspect;
  let press = u.input.x;
  let tighten = 1.0 - press * 0.5;

  var clusters = array<vec4<f32>, 8>(
    ${clusterList}
  );

  let coreC = CORE * aspect;
  let portrait = step(a, 1.0);
  let maskCenter = mix(vec2(0.17 * a, 0.53), vec2(0.5 * a, 0.72), portrait);
  let maskHalf = mix(vec2(0.145 * a, 0.135), vec2(0.5 * a, 0.2), portrait);
  let pointerC = u.pointer.zw * aspect;

  var col = vec3(0.0);
  var alpha = 0.0;

  let inkA = mix(vec3(0.24, 0.26, 0.12), vec3(0.72, 0.75, 0.5), dark);
  let inkB = mix(vec3(0.45, 0.46, 0.24), vec3(0.9, 0.92, 0.7), dark);

  let cellId = floor(cuv / CELL);

  for (var dy = -1; dy <= 1; dy = dy + 1) {
    for (var dx = -1; dx <= 1; dx = dx + 1) {
      let cell = cellId + vec2(f32(dx), f32(dy));
      let h = hash22(cell);
      let hExist = hash21(cell * 1.7 + 31.7);
      let hSize = hash21(cell + 7.3);

      let jitter = (h - 0.5) * 0.9 * tighten;
      let drift = 0.12 * vec2(sin(t * 0.3 + h.x * 40.0), cos(t * 0.26 + h.y * 40.0)) * tighten;
      var speck = (cell + 0.5 + jitter + drift) * CELL;

      var density = 0.008;
      for (var k = 0; k < 8; k = k + 1) {
        let cl = clusters[k];
        let cc = vec2(cl.x * a, cl.y);
        let q = speck - cc;
        density = density + cl.w * 1.6 * exp(-dot(q, q) / (cl.z * cl.z));
      }
      let qc = speck - coreC;
      density = density + 1.8 * exp(-dot(qc, qc) / (0.05 * 0.05));

      let rectD = abs(speck - maskCenter) - maskHalf;
      let outside = length(max(rectD, vec2(0.0)));
      density = density * smoothstep(0.0, 0.1, outside);

      let away = speck - pointerC;
      let push = exp(-dot(away, away) * 30.0);
      speck = speck + away * push * 0.18;

      let exist = step(hExist, density);
      let half = CELL * (0.14 + 0.26 * hSize);
      let d = abs(cuv - speck);
      let cover = 1.0 - smoothstep(half - 0.0012, half + 0.0012, max(d.x, d.y));

      let r = length(speck - coreC);
      let reveal = smoothstep(0.0, 1.0, intro * 1.6 - r * 0.9);

      let ink = (0.35 + 0.5 * hSize) * cover * exist * reveal;
      col = col + mix(inkA, inkB, hSize) * ink;
      alpha = alpha + ink;
    }
  }

  alpha = clamp(alpha * mix(0.85, 0.7, dark), 0.0, 1.0);
  col = clamp(col * mix(0.85, 0.7, dark), vec3(0.0), vec3(1.0));
  return vec4(col, alpha);
}
`;
