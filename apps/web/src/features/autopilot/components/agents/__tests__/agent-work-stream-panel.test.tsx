import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  AgentWorkStreamPanel,
  type AgentWorkStreamPanelStream,
} from "@/features/autopilot/components/agents/agent-work-stream-panel";

describe("AgentWorkStreamPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the current streamed agent work", () => {
    const stream = {
      title: "Generating technical specification",
      status: "streaming",
      content: '{\n  "summary": "Building the architecture plan"\n}',
      model: "openai/gpt-5.4-mini",
      updatedAt: Date.now(),
    } satisfies AgentWorkStreamPanelStream;

    render(<AgentWorkStreamPanel stream={stream} />);

    expect(screen.getByText("Live work stream")).toBeInTheDocument();
    expect(
      screen.getByText("Generating technical specification")
    ).toBeInTheDocument();
    expect(screen.getByText("Streaming")).toBeInTheDocument();
    expect(screen.getByText("openai/gpt-5.4-mini")).toBeInTheDocument();
    expect(
      screen.getByText(/Building the architecture plan/)
    ).toBeInTheDocument();
  });
});
