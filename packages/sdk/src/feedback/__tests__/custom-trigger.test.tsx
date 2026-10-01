import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { RefletFeedback } from "../widget";

afterEach(cleanup);

function widgetRoot() {
  const host = document.querySelector("[data-reflet-widget]");
  if (!host?.shadowRoot) {
    throw new Error("Widget shadow root missing");
  }
  return host.shadowRoot;
}

it("opens from an app trigger and resumes a minimized draft without a second launcher", () => {
  render(
    <RefletFeedback
      captureOnOpen={false}
      devtools={false}
      publicKey="fb_pub_test"
      renderTrigger={(props) => <button {...props}>Report an issue</button>}
    />
  );
  const trigger = screen.getByRole("button", { name: "Report an issue" });
  expect(widgetRoot().querySelector(".launcher")).toBeNull();
  fireEvent.click(trigger);
  const message = widgetRoot().querySelector("textarea");
  const minimize = widgetRoot().querySelector(
    '[aria-label="Minimize feedback"]'
  );
  if (
    !(
      message instanceof HTMLTextAreaElement &&
      minimize instanceof HTMLButtonElement
    )
  ) {
    throw new Error("Feedback controls missing");
  }
  fireEvent.change(message, { target: { value: "Export is broken" } });
  act(() => minimize.click());
  expect(widgetRoot().querySelector(".panel")).toBeNull();
  expect(widgetRoot().querySelector(".launcher")).toBeNull();
  fireEvent.click(trigger);
  expect(widgetRoot().querySelector("textarea")).toHaveProperty(
    "value",
    "Export is broken"
  );
});

it("hides the app trigger when the widget is disabled", () => {
  render(
    <RefletFeedback
      devtools={false}
      enabled={false}
      renderTrigger={(props) => <button {...props}>Report an issue</button>}
    />
  );
  expect(screen.queryByRole("button", { name: "Report an issue" })).toBeNull();
});
