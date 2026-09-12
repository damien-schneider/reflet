import {
  RIPPLE_COUNT,
  RIPPLE_LIFETIME_SECONDS,
  WATER_DEPTH_SCALE,
} from "@/features/homepage/components/experience/hero/reflection/reflection-pointer";

export const REFLECTION_VERTEX_SHADER = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

export const REFLECTION_FRAGMENT_SHADER = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float previewAspect;
uniform vec4 ripples[${RIPPLE_COUNT}];
uniform sampler2D preview;

float surfaceHeight(vec2 point) {
  float height = sin(point.x * 3.0 + point.y * 18.0 - time * 0.45) * 0.006
    + sin(point.x * 5.0 - point.y * 31.0 + time * 0.3) * 0.003;
  for (int i = 0; i < ${RIPPLE_COUNT}; i++) {
    vec4 ripple = ripples[i];
    if (ripple.w == 0.0) continue;
    float distance = length(point - ripple.xy);
    float age = ripple.z;
    float radius = age * 0.38;
    float wavefront = distance - radius;
    float envelope = exp(-wavefront * wavefront / (0.012 + age * 0.014));
    float damping = exp(-age * 0.9) * (1.0 - smoothstep(3.5, ${RIPPLE_LIFETIME_SECONDS.toFixed(1)}, age));
    height += sin(wavefront * 42.0) * envelope * damping * ripple.w * 0.035;
  }
  return height;
}

void main() {
  vec2 uv = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y) / resolution;
  float aspect = resolution.x / resolution.y;
  vec2 point = vec2(uv.x, uv.y / aspect * ${WATER_DEPTH_SCALE.toFixed(1)});
  float height = surfaceHeight(point);
  vec2 normal = vec2(surfaceHeight(point + vec2(0.006, 0.0)), surfaceHeight(point + vec2(0.0, 0.006))) - height;
  vec2 refraction = normal * vec2(1.4, 2.2) + vec2(height * 0.035, height * 0.07);
  float perspective = 1.0 + uv.y * 0.1;
  vec2 mirroredUv = vec2((uv.x - 0.5) / perspective + 0.5, 1.0 - uv.y / aspect * previewAspect * 1.2);
  vec4 reflected = texture2D(preview, mirroredUv + refraction);
  float reflectionMask = smoothstep(0.0, 0.035, mirroredUv.y) * (1.0 - smoothstep(0.72, 1.0, uv.y));
  float fresnel = 0.62 * pow(1.0 - uv.y, 1.5);
  float alpha = reflected.a * fresnel * reflectionMask;
  float light = clamp(1.0 + normal.y * 4.0, 0.7, 1.25);
  gl_FragColor = vec4(reflected.rgb * light * alpha, alpha);
}
`;
