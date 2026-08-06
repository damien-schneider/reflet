import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RefletFeedback } from "../widget";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function shadow(): ShadowRoot {
  const host = document.querySelector("[data-reflet-widget]");
  if (!(host instanceof HTMLElement && host.shadowRoot)) {
    throw new Error("Widget did not mount a shadow root");
  }
  return host.shadowRoot;
}

function launcher(): HTMLButtonElement {
  const button = shadow().querySelector(".launcher");
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error("Launcher missing");
  }
  return button;
}

function click(element: HTMLElement): void {
  act(() => {
    element.click();
  });
}

function mount() {
  return render(
    <RefletFeedback captureOnOpen={false} publicKey="fb_pub_test" />
  );
}

describe("RefletFeedback", () => {
  it("renders a launcher in a shadow root, not in the host DOM", () => {
    mount();

    expect(launcher().getAttribute("aria-label")).toBe("Feedback");
    expect(document.body.querySelector(".launcher")).toBeNull();
  });

  it("renders nothing when disabled", () => {
    render(<RefletFeedback enabled={false} publicKey="fb_pub_test" />);

    expect(document.querySelector("[data-reflet-widget]")).toBeNull();
  });

  it("lets a reporter hide the launcher for the configured duration", () => {
    const view = render(
      <RefletFeedback
        captureOnOpen={false}
        dismissForDays={7}
        publicKey="fb_pub_test"
      />
    );
    click(launcher());

    const dismiss = shadow().querySelector(".dismiss-btn");
    if (!(dismiss instanceof HTMLButtonElement)) {
      throw new Error("Dismiss action missing");
    }
    click(dismiss);

    expect(document.querySelector("[data-reflet-widget]")).toBeNull();

    view.unmount();
    render(
      <RefletFeedback
        captureOnOpen={false}
        dismissForDays={7}
        publicKey="fb_pub_test"
      />
    );

    expect(document.querySelector("[data-reflet-widget]")).toBeNull();
  });

  it("opens the panel on click and closes it again", () => {
    mount();

    click(launcher());
    expect(shadow().querySelector(".panel")).not.toBeNull();

    click(launcher());
    expect(shadow().querySelector(".panel")).toBeNull();
  });

  it("keeps the submit button disabled until something is written", () => {
    mount();
    click(launcher());

    const submit = shadow().querySelector(".submit");
    const textarea = shadow().querySelector("textarea");
    if (
      !(
        submit instanceof HTMLButtonElement &&
        textarea instanceof HTMLTextAreaElement
      )
    ) {
      throw new Error("Panel controls missing");
    }

    expect(submit.disabled).toBe(true);

    act(() => {
      fireEvent.change(textarea, {
        target: { value: "The export button does nothing" },
      });
    });

    expect(submit.disabled).toBe(false);
  });

  it("switches the reported category", () => {
    mount();
    click(launcher());

    const chips = shadow().querySelectorAll(".segmented button");
    const [bug, idea] = Array.from(chips);
    if (!(bug instanceof HTMLElement && idea instanceof HTMLElement)) {
      throw new Error("Category chips missing");
    }

    expect(bug.getAttribute("aria-pressed")).toBe("true");
    click(idea);

    expect(idea.getAttribute("aria-pressed")).toBe("true");
    expect(bug.getAttribute("aria-pressed")).toBe("false");
  });

  it("asks anonymous reporters for an email but not identified ones", () => {
    mount();
    click(launcher());
    expect(shadow().querySelector('input[type="email"]')).not.toBeNull();

    cleanup();

    render(
      <RefletFeedback
        captureOnOpen={false}
        publicKey="fb_pub_test"
        user={{ id: "usr_1" }}
      />
    );
    click(launcher());

    expect(shadow().querySelector('input[type="email"]')).toBeNull();
  });

  it("offers the element picker from the panel", () => {
    mount();
    click(launcher());

    const buttons = Array.from(shadow().querySelectorAll(".ghost-btn"));
    const picker = buttons.find((button) =>
      button.textContent?.includes("Point at an element")
    );
    if (!(picker instanceof HTMLElement)) {
      throw new Error("Picker trigger missing");
    }

    click(picker);

    expect(shadow().querySelector(".picker-hint")).not.toBeNull();
    expect(shadow().querySelector(".panel")).toBeNull();
  });

  it("places the widget at the requested corner", () => {
    render(
      <RefletFeedback
        captureOnOpen={false}
        position="top-left"
        publicKey="fb_pub_test"
      />
    );

    expect(shadow().querySelector(".root")?.getAttribute("data-position")).toBe(
      "top-left"
    );
  });
});
