"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { ArrowUpRight, Layers, MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FeedbackPreview } from "@/features/homepage/components/experience/features/feedback-preview";
import {
  PlanPreview,
  ReleasePreview,
} from "@/features/homepage/components/experience/features/product-previews";
import "@/features/homepage/components/experience/features/features.css";
import "@/features/homepage/components/experience/features/features-responsive.css";

const FEATURE_PREVIEWS = [
  {
    component: FeedbackPreview,
    description: "Feedback, right inside your product.",
    icon: MessageCircle,
    id: "collect",
    label: "Collect",
    title: "Collect in the moment",
  },
  {
    component: PlanPreview,
    description: "Turn requests into a clear next step.",
    icon: Layers,
    id: "plan",
    label: "Plan",
    title: "Plan with context",
  },
  {
    component: ReleasePreview,
    description: "Ship it. Tell the people who asked.",
    icon: Send,
    id: "release",
    label: "Release",
    title: "Close the loop",
  },
] as const;

export function FeatureExplorer() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = FEATURE_PREVIEWS[selectedIndex];
  return (
    <div className="feature-explorer">
      <div className="feature-explorer-copy">
        <FeatureChoices
          onSelect={setSelectedIndex}
          selectedIndex={selectedIndex}
        />
        <p aria-live="polite" className="feature-mobile-description">
          {selected.description}
        </p>
        <Link className="marketing-text-link" href="/docs">
          Explore the documentation{" "}
          <ArrowUpRight aria-hidden="true" size={14} />
        </Link>
      </div>
      <FeaturePreview selectedIndex={selectedIndex} />
    </div>
  );
}

interface FeatureChoicesProps {
  onSelect: (index: number) => void;
  selectedIndex: number;
}

function FeatureChoices({ selectedIndex, onSelect }: FeatureChoicesProps) {
  return (
    <fieldset aria-label="Explore Reflet features" className="feature-selector">
      {FEATURE_PREVIEWS.map((feature, index) => (
        <Button
          active={index === selectedIndex}
          aria-controls="feature-preview"
          aria-label={feature.title}
          aria-pressed={index === selectedIndex}
          className="feature-selector-button"
          data-feature={feature.id}
          key={feature.id}
          onClick={() => onSelect(index)}
          variant="ghost"
        >
          <span className="feature-selector-icon">
            <feature.icon aria-hidden="true" size={18} />
          </span>
          <span>
            <strong>
              <span className="feature-label-full">{feature.title}</span>
              <span className="feature-label-short">{feature.label}</span>
            </strong>
            <span>{feature.description}</span>
          </span>
          <ArrowUpRight aria-hidden="true" size={15} />
        </Button>
      ))}
    </fieldset>
  );
}

function FeaturePreview({ selectedIndex }: { selectedIndex: number }) {
  return (
    <section
      aria-label="Interactive feature preview"
      className="feature-preview-stage"
      id="feature-preview"
    >
      {FEATURE_PREVIEWS.map((feature, index) => (
        <div
          aria-hidden={index !== selectedIndex}
          className="feature-preview-body"
          data-active={index === selectedIndex}
          data-feature={feature.id}
          inert={index !== selectedIndex}
          key={feature.id}
        >
          <feature.component />
        </div>
      ))}
    </section>
  );
}
