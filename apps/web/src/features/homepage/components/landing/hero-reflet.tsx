"use client";

import { useEffect, useRef } from "react";

import {
  FRAME_ASPECT,
  FRAME_DARK,
  FRAME_FLOATS,
  FRAME_INTRO,
  FRAME_TIME,
  MAX_RIPPLES,
  REFLET_SHADER,
  UNIFORM_FLOATS,
} from "./hero-reflet-shader";

const MAX_DPR = 1.5;
const RENDER_SCALE = 0.75;
const MOVE_SPACING_PX = 26;
const MOVE_AMP = 0.035;
const PRESS_AMP = 0.12;
const INTRO_SECONDS = 1.6;
const STATIC_TIME = 6;
// lib.dom types WebGPU but omits the GPUBufferUsage value; spec UNIFORM|COPY_DST
const USAGE_UNIFORM_COPY_DST = 0x00_48;

interface Gpu {
  bindGroup: GPUBindGroup;
  context: GPUCanvasContext;
  device: GPUDevice;
  pipeline: GPURenderPipeline;
  uniforms: GPUBuffer;
}

async function createGpu(canvas: HTMLCanvasElement): Promise<Gpu | null> {
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
  const module = device.createShaderModule({ code: REFLET_SHADER });
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

function renderFrame(gpu: Gpu, uniformData: Float32Array): void {
  gpu.device.queue.writeBuffer(gpu.uniforms, 0, uniformData);
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
  uniformData: Float32Array,
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
    uniformData[FRAME_ASPECT] =
      canvas.clientWidth / Math.max(1, canvas.clientHeight);
    onSized();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  signal.addEventListener("abort", () => observer.disconnect());
}

function watchTheme(
  signal: AbortSignal,
  onChange: (dark: boolean) => void
): void {
  const root = document.documentElement;
  const notify = () => onChange(root.classList.contains("dark"));
  notify();
  const observer = new MutationObserver(notify);
  observer.observe(root, { attributeFilter: ["class"], attributes: true });
  signal.addEventListener("abort", () => observer.disconnect());
}

function pointerToRipple(
  event: PointerEvent,
  canvas: HTMLCanvasElement
): { x: number; y: number } | null {
  const rect = canvas.getBoundingClientRect();
  if (rect.bottom <= 0 || rect.height === 0) {
    return null;
  }
  const insideCanvas =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  if (!insideCanvas) {
    return null;
  }
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: 1 - (event.clientY - rect.top) / rect.height,
  };
}

function animate(
  gpu: Gpu,
  canvas: HTMLCanvasElement,
  uniformData: Float32Array,
  signal: AbortSignal
): void {
  let time = 0;
  let last = performance.now();
  let intro = 0;
  let dark = uniformData[FRAME_DARK];
  let darkTarget = dark;
  let visible = true;
  let broken = false;
  let running = false;
  let raf = 0;
  let slot = 0;
  let lastX = Number.NEGATIVE_INFINITY;
  let lastY = Number.NEGATIVE_INFINITY;

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
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;
    intro = Math.min(1, intro + dt / INTRO_SECONDS);
    dark += (darkTarget - dark) * Math.min(1, dt * 6);
    uniformData[FRAME_TIME] = time;
    uniformData[FRAME_DARK] = dark;
    uniformData[FRAME_INTRO] = 1 - (1 - intro) ** 3;
    try {
      renderFrame(gpu, uniformData);
    } catch {
      broken = true;
      return;
    }
    schedule();
  }

  const addRipple = (x: number, y: number, amp: number) => {
    const base = FRAME_FLOATS + slot * 4;
    uniformData[base] = x;
    uniformData[base + 1] = y;
    uniformData[base + 2] = time;
    uniformData[base + 3] = amp;
    slot = (slot + 1) % MAX_RIPPLES;
  };

  const onMove = (event: PointerEvent) => {
    if (
      Math.hypot(event.clientX - lastX, event.clientY - lastY) < MOVE_SPACING_PX
    ) {
      return;
    }
    const uv = pointerToRipple(event, canvas);
    if (!uv) {
      return;
    }
    lastX = event.clientX;
    lastY = event.clientY;
    addRipple(uv.x, uv.y, MOVE_AMP);
  };

  const onDown = (event: PointerEvent) => {
    const uv = pointerToRipple(event, canvas);
    if (uv) {
      addRipple(uv.x, uv.y, PRESS_AMP);
    }
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

async function startReflet(
  canvas: HTMLCanvasElement,
  signal: AbortSignal
): Promise<void> {
  const gpu = await createGpu(canvas);
  if (!gpu) {
    return;
  }
  if (signal.aborted) {
    gpu.device.destroy();
    return;
  }
  signal.addEventListener("abort", () => gpu.device.destroy());

  const uniformData = new Float32Array(UNIFORM_FLOATS);
  uniformData[FRAME_DARK] = document.documentElement.classList.contains("dark")
    ? 1
    : 0;

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    uniformData[FRAME_TIME] = STATIC_TIME;
    uniformData[FRAME_INTRO] = 1;
    let broken = false;
    const renderStill = () => {
      if (broken || signal.aborted) {
        return;
      }
      try {
        renderFrame(gpu, uniformData);
      } catch {
        broken = true;
      }
    };
    watchResize(canvas, uniformData, signal, renderStill);
    watchTheme(signal, (isDark) => {
      uniformData[FRAME_DARK] = isDark ? 1 : 0;
      renderStill();
    });
    return;
  }

  watchResize(canvas, uniformData, signal, () => undefined);
  animate(gpu, canvas, uniformData, signal);
}

export default function HeroReflet() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const controller = new AbortController();
    startReflet(canvas, controller.signal).catch(() => undefined);
    return () => controller.abort();
  }, []);

  return <canvas className="h-full w-full" ref={canvasRef} />;
}
