"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { useEffect, useRef, useState } from "react";
import {
  type ProductMoment,
  ProductPreview,
} from "@/features/homepage/components/experience/hero/preview/product-preview";
import { observeReflection } from "@/features/homepage/components/experience/hero/reflection/observe-reflection";
import "@/features/homepage/components/experience/hero/reflection/reflection.css";

export function HeroReflection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<SVGSVGElement>(null);
  const [hasRenderer, setHasRenderer] = useState(false);
  const [moment, setMoment] = useState<ProductMoment>("idea");
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
        <fieldset
          aria-label="Explore the product preview"
          className="hero-preview-controls"
        >
          {PRODUCT_MOMENTS.map((item) => (
            <Button
              aria-pressed={moment === item.id}
              key={item.id}
              onClick={() => setMoment(item.id)}
              size="sm"
              variant="ghost"
            >
              {item.label}
            </Button>
          ))}
        </fieldset>
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

const PRODUCT_MOMENTS = [
  { id: "idea", label: "An idea" },
  { id: "plan", label: "Planned" },
  { id: "release", label: "Shipped" },
] as const;
