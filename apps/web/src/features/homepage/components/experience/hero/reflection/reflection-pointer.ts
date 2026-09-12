export const RIPPLE_COUNT = 12;
export const WATER_DEPTH_SCALE = 1.8;
export const RIPPLE_LIFETIME_SECONDS = 5;

export function observeReflectionPointer(canvas: HTMLCanvasElement) {
  const motionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );
  const impulses = Array.from({ length: RIPPLE_COUNT }, () => ({
    born: 0,
    strength: 0,
    x: 0,
    y: 0,
  }));
  const uniforms = new Float32Array(RIPPLE_COUNT * 4);
  const scene = canvas.closest(".hero-product-scene") ?? canvas;
  let elapsedSeconds = 0;
  let nextImpulse = 0;
  let previousPosition: { x: number; y: number; time: number } | null = null;

  function disturbSurface(event: Event) {
    if (!(event instanceof PointerEvent) || motionPreference.matches) {
      return;
    }
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = Math.min(
      0.95,
      Math.abs(event.clientY - bounds.top) / bounds.height
    );
    const distance = previousPosition
      ? Math.hypot(x - previousPosition.x, y - previousPosition.y)
      : 0.08;
    const secondsSinceLast = previousPosition
      ? elapsedSeconds - previousPosition.time
      : 1;
    if (
      event.type !== "pointerdown" &&
      (distance < 0.025 || secondsSinceLast < 0.035)
    ) {
      return;
    }
    impulses[nextImpulse] = {
      born: elapsedSeconds,
      strength: Math.min(1, 0.3 + distance * 3),
      x,
      y: ((y * bounds.height) / bounds.width) * WATER_DEPTH_SCALE,
    };
    nextImpulse = (nextImpulse + 1) % RIPPLE_COUNT;
    previousPosition = { time: elapsedSeconds, x, y };
  }
  function resetPointer() {
    previousPosition = null;
  }
  function clearRipples() {
    resetPointer();
    for (const impulse of impulses) {
      impulse.strength = 0;
    }
  }
  scene.addEventListener("pointermove", disturbSurface);
  scene.addEventListener("pointerdown", disturbSurface);
  scene.addEventListener("pointerleave", resetPointer);
  scene.addEventListener("pointercancel", resetPointer);
  motionPreference.addEventListener("change", clearRipples);
  return {
    dispose() {
      scene.removeEventListener("pointermove", disturbSurface);
      scene.removeEventListener("pointerdown", disturbSurface);
      scene.removeEventListener("pointerleave", resetPointer);
      scene.removeEventListener("pointercancel", resetPointer);
      motionPreference.removeEventListener("change", clearRipples);
    },
    read(seconds: number) {
      elapsedSeconds = seconds;
      for (const [index, impulse] of impulses.entries()) {
        const age = seconds - impulse.born;
        const strength = age < RIPPLE_LIFETIME_SECONDS ? impulse.strength : 0;
        uniforms.set([impulse.x, impulse.y, age, strength], index * 4);
      }
      return uniforms;
    },
  };
}
