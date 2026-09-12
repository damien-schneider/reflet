import { createReflectionAnimation } from "@/features/homepage/components/experience/hero/reflection/reflection-animation";
import { createReflectionRenderer } from "@/features/homepage/components/experience/hero/reflection/reflection-renderer";
import { observePreviewImage } from "@/features/homepage/components/experience/hero/reflection/reflection-texture";

export function observeReflection(
  { canvas, preview }: { canvas: HTMLCanvasElement; preview: SVGSVGElement },
  onRendererChange: (hasRenderer: boolean) => void
) {
  let reflection: ReturnType<typeof animateReflection>;
  const stopImage = observePreviewImage(preview, (image) => {
    if (!image) {
      reflection?.dispose();
      reflection = undefined;
      onRendererChange(false);
      return;
    }
    if (reflection) {
      reflection.updateImage(image);
      return;
    }
    reflection = animateReflection({ canvas, image }, onRendererChange);
  });
  return () => {
    stopImage();
    reflection?.dispose();
  };
}

function animateReflection(
  surface: { canvas: HTMLCanvasElement; image: HTMLImageElement },
  onRendererChange: (hasRenderer: boolean) => void
) {
  const { canvas } = surface;
  const renderer = createReflectionRenderer(surface);
  if (!renderer) {
    return;
  }
  const animation = createReflectionAnimation(renderer.render);
  let contextLost = false;
  const stopVisibility = observeMotionVisibility(canvas, (mode) => {
    animation.pause();
    if (contextLost || mode === "hidden") {
      return;
    }
    renderer.resize();
    animation.paint();
    onRendererChange(true);
    if (mode === "moving") {
      animation.resume();
    }
  });
  function handleContextLoss() {
    contextLost = true;
    animation.pause();
    onRendererChange(false);
  }
  canvas.addEventListener("webglcontextlost", handleContextLoss);
  return {
    dispose() {
      animation.pause();
      stopVisibility();
      canvas.removeEventListener("webglcontextlost", handleContextLoss);
      renderer.dispose();
    },
    updateImage(image: HTMLImageElement) {
      if (contextLost) {
        return;
      }
      renderer.updateImage(image);
      animation.paint();
    },
  };
}

function observeMotionVisibility(
  canvas: HTMLCanvasElement,
  onVisibilityChange: (mode: "hidden" | "still" | "moving") => void
) {
  const motionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );
  let isVisible = false;
  function reconcileVisibility() {
    if (!isVisible || document.hidden) {
      onVisibilityChange("hidden");
      return;
    }
    onVisibilityChange(motionPreference.matches ? "still" : "moving");
  }

  const visibility = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    reconcileVisibility();
  });
  const resize = new ResizeObserver(reconcileVisibility);
  visibility.observe(canvas);
  resize.observe(canvas);
  document.addEventListener("visibilitychange", reconcileVisibility);
  motionPreference.addEventListener("change", reconcileVisibility);
  return () => {
    visibility.disconnect();
    resize.disconnect();
    document.removeEventListener("visibilitychange", reconcileVisibility);
    motionPreference.removeEventListener("change", reconcileVisibility);
  };
}
