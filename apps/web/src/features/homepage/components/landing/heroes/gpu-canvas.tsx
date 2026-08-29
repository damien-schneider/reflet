"use client";

import { useEffect, useRef } from "react";

import {
  FRAME_ASPECT,
  FRAME_DARK,
  FRAME_INTRO,
  FRAME_TIME,
  GPU_PREAMBLE,
  INPUT_PRESS,
  INPUT_SCROLL,
  INPUT_SEED,
  INPUT_SPEED,
  POINTER_SMOOTH_X,
  POINTER_SMOOTH_Y,
  POINTER_X,
  POINTER_Y,
  UNIFORM_FLOATS,
} from "./gpu-preamble";

const MAX_DPR = 1.5;
const RENDER_SCALE = 0.8;
const INTRO_SECONDS = 1.8;
const STILL_TIME = 8;
const POINTER_EASE = 3.2;
const POINTER_PARKED = -10;
const PRESS_DECAY = 1.6;
const THEME_EASE = 6;
const MAX_STEP = 0.05;
// lib.dom types WebGPU but omits the GPUBufferUsage value; spec UNIFORM|COPY_DST
const USAGE_UNIFORM_COPY_DST = 0x00_48;

interface Gpu {
  bindGroup: GPUBindGroup;
  context: GPUCanvasContext;
  device: GPUDevice;
  pipeline: GPURenderPipeline;
  uniforms: GPUBuffer;
}

async function createGpu(
  canvas: HTMLCanvasElement,
  fragment: string
): Promise<Gpu | null> {
  const gpu = navigator.gpu;
  if (!gpu) {
    return null;
  }
  const adapter = await gpu.requestAdapter();
  if (!adapter) {
    return null;
  }
  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu");
  if (!(context && "getCurrentTexture" in context)) {
    device.destroy();
    return null;
  }
  const format = gpu.getPreferredCanvasFormat();
  context.configure({ alphaMode: "premultiplied", device, format });
  const module = device.createShaderModule({
    code: `${GPU_PREAMBLE}\n${fragment}`,
  });
  const pipeline = device.createRenderPipeline({
    fragment: { entryPoint: "fs", module, targets: [{ format }] },
    layout: "auto",
    primitive: { topology: "triangle-list" },
    vertex: { entryPoint: "vs", module },
  });
  const uniforms = device.createBuffer({
    size: UNIFORM_FLOATS * 4,
    usage: USAGE_UNIFORM_COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    entries: [{ binding: 0, resource: { buffer: uniforms } }],
    layout: pipeline.getBindGroupLayout(0),
  });
  return { bindGroup, context, device, pipeline, uniforms };
}

function renderFrame(gpu: Gpu, data: Float32Array): void {
  gpu.device.queue.writeBuffer(gpu.uniforms, 0, data);
  const encoder = gpu.device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        clearValue: { a: 0, b: 0, g: 0, r: 0 },
        loadOp: "clear",
        storeOp: "store",
        view: gpu.context.getCurrentTexture().createView(),
      },
    ],
  });
  pass.setPipeline(gpu.pipeline);
  pass.setBindGroup(0, gpu.bindGroup);
  pass.draw(3);
  pass.end();
  gpu.device.queue.submit([encoder.finish()]);
}

function watchResize(
  canvas: HTMLCanvasElement,
  data: Float32Array,
  signal: AbortSignal,
  onSized: () => void
): void {
  const resize = () => {
    const scale =
      Math.min(window.devicePixelRatio || 1, MAX_DPR) * RENDER_SCALE;
    const width = Math.max(1, Math.round(canvas.clientWidth * scale));
    const height = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    data[FRAME_ASPECT] = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    onSized();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  signal.addEventListener("abort", () => observer.disconnect());
}

function watchTheme(signal: AbortSignal, onChange: (dark: boolean) => void) {
  const root = document.documentElement;
  const notify = () => onChange(root.classList.contains("dark"));
  notify();
  const observer = new MutationObserver(notify);
  observer.observe(root, { attributeFilter: ["class"], attributes: true });
  signal.addEventListener("abort", () => observer.disconnect());
}

function animate(
  gpu: Gpu,
  canvas: HTMLCanvasElement,
  data: Float32Array,
  signal: AbortSignal
): void {
  let time = 0;
  let last = performance.now();
  let intro = 0;
  let dark = data[FRAME_DARK];
  let darkTarget = dark;
  let visible = true;
  let broken = false;
  let running = false;
  let raf = 0;

  const schedule = () => {
    if (running || broken || !visible || signal.aborted || document.hidden) {
      return;
    }
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };

  function tick(now: number) {
    running = false;
    if (signal.aborted || broken) {
      return;
    }
    const dt = Math.min((now - last) / 1000, MAX_STEP);
    last = now;
    time += dt;
    intro = Math.min(1, intro + dt / INTRO_SECONDS);
    dark += (darkTarget - dark) * Math.min(1, dt * THEME_EASE);

    if (data[POINTER_SMOOTH_X] === POINTER_PARKED) {
      data[POINTER_SMOOTH_X] = data[POINTER_X];
      data[POINTER_SMOOTH_Y] = data[POINTER_Y];
    }
    const ease = Math.min(1, dt * POINTER_EASE);
    const dx = (data[POINTER_X] - data[POINTER_SMOOTH_X]) * ease;
    const dy = (data[POINTER_Y] - data[POINTER_SMOOTH_Y]) * ease;
    data[POINTER_SMOOTH_X] += dx;
    data[POINTER_SMOOTH_Y] += dy;
    data[INPUT_SPEED] = Math.min(1, Math.hypot(dx, dy) * 26);
    data[INPUT_PRESS] = Math.max(0, data[INPUT_PRESS] - dt * PRESS_DECAY);
    data[INPUT_SCROLL] = Math.min(
      1,
      window.scrollY / Math.max(1, window.innerHeight)
    );
    data[FRAME_TIME] = time;
    data[FRAME_DARK] = dark;
    data[FRAME_INTRO] = 1 - (1 - intro) ** 3;

    try {
      renderFrame(gpu, data);
    } catch {
      broken = true;
      return;
    }
    schedule();
  }

  const onMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.height === 0) {
      return;
    }
    data[POINTER_X] = (event.clientX - rect.left) / rect.width;
    data[POINTER_Y] = 1 - (event.clientY - rect.top) / rect.height;
  };

  const onDown = () => {
    data[INPUT_PRESS] = 1;
  };

  window.addEventListener("pointermove", onMove, { passive: true, signal });
  window.addEventListener("pointerdown", onDown, { passive: true, signal });
  document.addEventListener("visibilitychange", schedule, { signal });

  const io = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    schedule();
  });
  io.observe(canvas);
  signal.addEventListener("abort", () => {
    io.disconnect();
    cancelAnimationFrame(raf);
  });

  watchTheme(signal, (isDark) => {
    darkTarget = isDark ? 1 : 0;
    schedule();
  });

  gpu.device.lost.then(() => {
    broken = true;
  });

  schedule();
}

async function start(
  canvas: HTMLCanvasElement,
  fragment: string,
  signal: AbortSignal
): Promise<void> {
  const gpu = await createGpu(canvas, fragment);
  if (!gpu) {
    return;
  }
  if (signal.aborted) {
    gpu.device.destroy();
    return;
  }
  signal.addEventListener("abort", () => gpu.device.destroy());

  const data = new Float32Array(UNIFORM_FLOATS);
  data[FRAME_DARK] = document.documentElement.classList.contains("dark")
    ? 1
    : 0;
  data[POINTER_X] = POINTER_PARKED;
  data[POINTER_Y] = POINTER_PARKED;
  data[POINTER_SMOOTH_X] = POINTER_PARKED;
  data[POINTER_SMOOTH_Y] = POINTER_PARKED;
  data[INPUT_SEED] = Math.random();

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    data[FRAME_TIME] = STILL_TIME;
    data[FRAME_INTRO] = 1;
    let broken = false;
    const renderStill = () => {
      if (broken || signal.aborted) {
        return;
      }
      try {
        renderFrame(gpu, data);
      } catch {
        broken = true;
      }
    };
    watchResize(canvas, data, signal, renderStill);
    watchTheme(signal, (isDark) => {
      data[FRAME_DARK] = isDark ? 1 : 0;
      renderStill();
    });
    return;
  }

  watchResize(canvas, data, signal, () => undefined);
  animate(gpu, canvas, data, signal);
}

export default function GpuCanvas({
  className,
  shader,
}: {
  className?: string;
  shader: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const controller = new AbortController();
    start(canvas, shader, controller.signal).catch(() => undefined);
    return () => controller.abort();
  }, [shader]);

  return <canvas className={className} ref={canvasRef} />;
}
