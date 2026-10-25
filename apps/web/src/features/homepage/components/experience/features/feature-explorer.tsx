"use client";

import { Tabs } from "@base-ui/react/tabs";
import { Layers, MessageCircle, Send } from "lucide-react";
import { type ReactNode, useState } from "react";
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

export function FeatureExplorer({ children }: { children: ReactNode }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const selected = FEATURE_PREVIEWS[selectedIndex];
  return (
    <Tabs.Root
      className="feature-explorer"
      data-interacted={interacted}
      onValueChange={(value) => {
        if (typeof value === "number") {
          setInteracted(true);
          setSelectedIndex(value);
        }
      }}
      orientation="vertical"
      value={selectedIndex}
    >
      <div className="feature-explorer-copy">
        {children}
        <FeatureChoices />
        <p aria-live="polite" className="feature-mobile-description">
          {selected.description}
        </p>
      </div>
      <FeaturePreview />
    </Tabs.Root>
  );
}

function FeatureChoices() {
  return (
    <Tabs.List
      aria-label="Explore Reflet features"
      className="feature-selector"
    >
      {FEATURE_PREVIEWS.map((feature, index) => (
        <Tabs.Tab
          aria-label={feature.title}
          className="feature-selector-button"
          data-feature={feature.id}
          key={feature.id}
          value={index}
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
        </Tabs.Tab>
      ))}
    </Tabs.List>
  );
}

function FeaturePreview() {
  return (
    <section
      aria-label="Interactive feature preview"
      className="feature-preview-stage"
    >
      {FEATURE_PREVIEWS.map((feature, index) => (
        <Tabs.Panel
          className="feature-preview-body"
          data-feature={feature.id}
          hidden={false}
          keepMounted
          key={feature.id}
          value={index}
        >
          <feature.component />
        </Tabs.Panel>
      ))}
    </section>
  );
}
