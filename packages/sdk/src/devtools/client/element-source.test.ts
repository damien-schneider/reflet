import { expect, it } from "vitest";
import {
  type CodeFrame,
  locateElementSource,
  traceElementSource,
} from "./element-source";
import { fakeFiber, site } from "./testing/fake-fibers";

function App() {
  return null;
}
function SettingsForm() {
  return null;
}
function Card() {
  return null;
}
function Button() {
  return null;
}
function Profile() {
  return null;
}
function TextField() {
  return null;
}
async function trace(element: Element) {
  const frames: CodeFrame[] = [];
  for await (const frame of traceElementSource(element)) {
    frames.push(frame);
  }
  return frames.map((frame) => ({
    at: `${frame.request.fileName}:${frame.request.line}`,
    component: frame.component,
    drawn: frame.node?.tagName.toLowerCase(),
  }));
}

it("climbs from the picked element to each component that uses it, with what each one draws", async () => {
  const section = document.createElement("section");
  const cardBox = document.createElement("div");
  const button = document.createElement("button");
  const label = document.createElement("span");

  const app = fakeFiber({
    createdAt: site("/repo/src/main.tsx", 9),
    type: App,
  });
  const sectionFiber = fakeFiber({
    createdAt: site("/repo/src/app.tsx", 14),
    node: section,
    owner: app,
    parent: app,
    type: "section",
  });
  const form = fakeFiber({
    createdAt: site("/repo/src/app.tsx", 15),
    owner: app,
    parent: sectionFiber,
    type: SettingsForm,
  });
  const card = fakeFiber({
    createdAt: site("/repo/src/settings-form.tsx", 8),
    owner: form,
    parent: form,
    type: Card,
  });
  const cardBoxFiber = fakeFiber({
    createdAt: site("/repo/src/ui/card.tsx", 3),
    node: cardBox,
    owner: card,
    parent: card,
    type: "div",
  });
  const buttonComponent = fakeFiber({
    createdAt: site("/repo/src/settings-form.tsx", 17),
    owner: form,
    parent: cardBoxFiber,
    type: Button,
  });
  const buttonFiber = fakeFiber({
    createdAt: site("/repo/src/ui/button.tsx", 9),
    node: button,
    owner: buttonComponent,
    parent: buttonComponent,
    type: "button",
  });
  fakeFiber({
    createdAt: site("/repo/src/ui/button.tsx", 22),
    node: label,
    owner: buttonComponent,
    parent: buttonFiber,
    type: "span",
  });

  expect(await trace(label)).toEqual([
    { at: "/repo/src/ui/button.tsx:22", component: "Button", drawn: "span" },
    {
      at: "/repo/src/settings-form.tsx:17",
      component: "SettingsForm",
      drawn: "button",
    },
    { at: "/repo/src/app.tsx:15", component: "App", drawn: "div" },
    { at: "/repo/src/main.tsx:9", component: null, drawn: "section" },
  ]);
});

it("passes over what a library wrote and lands where the app uses it", async () => {
  const wrapper = document.createElement("div");
  const input = document.createElement("input");

  const profile = fakeFiber({
    createdAt: site("/repo/src/app.tsx", 5),
    type: Profile,
  });
  const textField = fakeFiber({
    createdAt: site("/repo/src/profile.tsx", 12, 6),
    owner: profile,
    parent: profile,
    type: TextField,
  });
  const wrapperFiber = fakeFiber({
    createdAt: site("/repo/node_modules/ui-kit/dist/text-field.js", 40),
    node: wrapper,
    owner: textField,
    parent: textField,
    type: "div",
  });
  fakeFiber({
    createdAt: site("/repo/node_modules/ui-kit/dist/text-field.js", 41),
    node: input,
    owner: textField,
    parent: wrapperFiber,
    type: "input",
  });

  expect(await trace(input)).toEqual([
    { at: "/repo/src/profile.tsx:12", component: "Profile", drawn: "div" },
    { at: "/repo/src/app.tsx:5", component: null, drawn: "div" },
  ]);
  expect(await locateElementSource(input)).toEqual({
    column: 6,
    fileName: "/repo/src/profile.tsx",
    line: 12,
  });
});
