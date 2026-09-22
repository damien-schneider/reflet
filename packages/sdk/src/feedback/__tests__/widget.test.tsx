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

    expect(launcher().textContent).toContain("Feedback");
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

    const cancel = shadow().querySelector(".options-popover .ghost-btn");
    if (!(cancel instanceof HTMLButtonElement)) {
      throw new Error("Cancel missing");
    }
    click(cancel);
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

  it("keeps keys typed in the message away from the host page's shortcuts", () => {
    const hostShortcuts: string[] = [];
    const recordHostKey = (event: KeyboardEvent) => {
      hostShortcuts.push(event.type);
    };
    window.addEventListener("keydown", recordHostKey, true);
    window.addEventListener("keyup", recordHostKey, true);
    mount();
    click(launcher());
    const message = shadow().querySelector("textarea");
    if (!(message instanceof HTMLTextAreaElement)) {
      throw new Error("Message field missing");
    }

    fireEvent.keyDown(message, { key: " " });
    fireEvent.keyUp(message, { key: " " });
    fireEvent.keyDown(document.body, { key: " " });

    window.removeEventListener("keydown", recordHostKey, true);
    window.removeEventListener("keyup", recordHostKey, true);
    expect(hostShortcuts).toEqual(["keydown"]);
  });

  it("minimizes the panel on Escape pressed in the message", () => {
    mount();
    click(launcher());
    const message = shadow().querySelector("textarea");
    if (!(message instanceof HTMLTextAreaElement)) {
      throw new Error("Message field missing");
    }

    act(() => {
      fireEvent.keyDown(message, { key: "Escape" });
    });

    expect(shadow().querySelector(".panel")).toBeNull();
  });

  it("closes on the hotkey pressed in the message", () => {
    render(
      <RefletFeedback
        captureOnOpen={false}
        hotkey="alt+f"
        publicKey="fb_pub_test"
      />
    );
    click(launcher());
    const message = shadow().querySelector("textarea");
    if (!(message instanceof HTMLTextAreaElement)) {
      throw new Error("Message field missing");
    }

    let hotkeyReachedBrowser = true;
    act(() => {
      hotkeyReachedBrowser = fireEvent.keyDown(message, {
        altKey: true,
        key: "f",
      });
    });

    expect(shadow().querySelector(".panel")).toBeNull();
    expect(hotkeyReachedBrowser).toBe(false);
  });

  it("keeps the draft when temporarily minimized and restored", () => {
    mount();
    click(launcher());
    const message = shadow().querySelector("textarea");
    const minimize = shadow().querySelector('[aria-label="Minimize feedback"]');
    if (
      !(
        message instanceof HTMLTextAreaElement &&
        minimize instanceof HTMLButtonElement
      )
    ) {
      throw new Error("Composer controls missing");
    }
    fireEvent.change(message, { target: { value: "Keep my draft" } });
    click(minimize);
    expect(shadow().querySelector("textarea")).toBeNull();
    click(launcher());
    expect(shadow().querySelector("textarea")?.value).toBe("Keep my draft");
  });

  it("returns the launcher to its corner after the panel was dragged away", () => {
    mount();
    click(launcher());
    const handle = shadow().querySelector(".drag-handle");
    const minimize = shadow().querySelector('[aria-label="Minimize feedback"]');
    if (
      !(
        handle instanceof HTMLButtonElement &&
        minimize instanceof HTMLButtonElement
      )
    ) {
      throw new Error("Floating controls missing");
    }
    let captured = false;
    handle.setPointerCapture = () => {
      captured = true;
    };
    handle.hasPointerCapture = () => captured;
    handle.releasePointerCapture = () => {
      captured = false;
    };
    act(() => {
      fireEvent.pointerDown(handle, {
        button: 0,
        clientX: 10,
        clientY: 10,
        pointerId: 1,
      });
      fireEvent.pointerMove(handle, {
        clientX: 240,
        clientY: 180,
        pointerId: 1,
      });
      fireEvent.pointerUp(handle, { pointerId: 1 });
    });
    expect(shadow().querySelector(".root")?.getAttribute("data-moved")).toBe(
      "true"
    );

    click(minimize);

    expect(shadow().querySelector(".root")?.getAttribute("data-moved")).toBe(
      "false"
    );
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

    const picker = shadow().querySelector('[aria-label="Point at an element"]');
    if (!(picker instanceof HTMLElement)) {
      throw new Error("Picker trigger missing");
    }

    click(picker);

    expect(shadow().querySelector(".picker-hint")).not.toBeNull();
    expect(shadow().querySelector(".root")?.getAttribute("data-editing")).toBe(
      "true"
    );
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
