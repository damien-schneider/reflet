"use client";

import { useEffect, useRef, useState } from "react";
import {
  type ProductMoment,
  ProductPreview,
} from "@/features/homepage/components/experience/hero/preview/product-preview";
import { observeReflection } from "@/features/homepage/components/experience/hero/reflection/observe-reflection";
import "@/features/homepage/components/experience/hero/reflection/reflection.css";

export function HeroReflection({ moment }: { moment: ProductMoment }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<SVGSVGElement>(null);
  const [hasRenderer, setHasRenderer] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    const preview = previewRef.current;
    if (!(canvas && preview)) {
      return;
    }
    return observeReflection({ canvas, preview }, setHasRenderer);
  }, []);
  return (
    <figure className="hero-product-scene">
      <div className="hero-product-preview">
        <ProductPreview moment={moment} previewRef={previewRef} />
      </div>
      <div
        aria-hidden="true"
        className="hero-reflection"
        data-renderer={hasRenderer ? "webgl" : "fallback"}
      >
        <div className="hero-reflection-fallback">
          <ProductPreview moment={moment} />
        </div>
        <canvas className="hero-reflection-canvas" ref={canvasRef} />
      </div>
    </figure>
  );
}
