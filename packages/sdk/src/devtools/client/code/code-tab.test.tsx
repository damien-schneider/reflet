import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DEVTOOLS_STATUS_MARKER, type SourceFile } from "../../protocol";
import type { DevRouteState } from "../route/use-dev-route";
import {
  type FakeServerComponent,
  fakeFiber,
  serverStack,
  site,
} from "../testing/fake-fibers";
import { CodeTab } from "./code-tab";
import { useCodeLookup } from "./use-code-lookup";

const READY: DevRouteState = {
  kind: "ready",
  status: {
    board: { canConnect: false, kind: "disconnected" },
    editor: "vscode",
    machineAccounts: [],
    marker: DEVTOOLS_STATUS_MARKER,
  },
};
const NODE_MODULES_REFUSAL =
  "Reflet devtools does not read files inside node_modules.";
const SERVER_CHUNKS =
  "about://React/Server/file:///repo/.next/server/chunks/ssr";

function App() {
  return null;
}
function SettingsForm() {
  return null;
}
function Button() {
  return null;
}
function SaveButton() {
  return null;
}

function sourceFile(path: string, line: number): SourceFile {
  return {
    absolutePath: `/repo/${path}`,
    code: Array.from({ length: 30 }, (_, index) => `line ${index + 1}`).join(
      "\n"
    ),
    column: 4,
    elementLines: { end: line + 2, start: line },
    line,
    path,
  };
}

const devRoute = vi.fn<(file: string) => Response>();

beforeEach(() => {
  Element.prototype.scrollIntoView = () => undefined;
  vi.stubGlobal("fetch", (url: string) =>
    Promise.resolve(
      devRoute(new URL(url, "http://localhost").searchParams.get("file") ?? "")
    )
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  devRoute.mockReset();
});

function answerWith(files: Record<string, SourceFile | string>) {
  devRoute.mockImplementation((file) => {
    const answer = files[file];
    if (answer === undefined) {
      return Response.json({ error: `${file} not stubbed` }, { status: 404 });
    }
    return typeof answer === "string"
      ? Response.json({ error: answer }, { status: 403 })
      : Response.json(answer);
  });
}

function InspectedElement({ element }: { element: Element }) {
  const { codeLookup, inspectElement, selectFrame } = useCodeLookup(
    () => undefined
  );
  return (
    <>
      <button onClick={() => inspectElement(element)} type="button">
        Inspect
      </button>
      {codeLookup && (
        <CodeTab
          lookup={codeLookup}
          onSelectFrame={selectFrame}
          route={READY}
        />
      )}
    </>
  );
}

function crumb(name: string) {
  return within(
    screen.getByRole("navigation", { name: "Component path" })
  ).getByRole("button", { name });
}

it("reads up to where the element's component is used, and back down", async () => {
  const picked = document.createElement("button");
  const app = fakeFiber({
    createdAt: site("/repo/src/main.tsx", 9),
    type: App,
  });
  const form = fakeFiber({
    createdAt: site("/repo/src/app.tsx", 15),
    owner: app,
    parent: app,
    type: SettingsForm,
  });
  const buttonComponent = fakeFiber({
    createdAt: site("/repo/src/settings-form.tsx", 17),
    owner: form,
    parent: form,
    type: Button,
  });
  fakeFiber({
    createdAt: site("/repo/src/ui/button.tsx", 9),
    node: picked,
    owner: buttonComponent,
    parent: buttonComponent,
    type: "button",
  });
  answerWith({
    "/repo/src/app.tsx": sourceFile("src/app.tsx", 15),
    "/repo/src/main.tsx": sourceFile("src/main.tsx", 9),
    "/repo/src/settings-form.tsx": sourceFile("src/settings-form.tsx", 17),
    "/repo/src/ui/button.tsx": sourceFile("src/ui/button.tsx", 9),
  });
  render(<InspectedElement element={picked} />);

  fireEvent.click(screen.getByRole("button", { name: "Inspect" }));

  await screen.findByTitle("src/ui/button.tsx:9");
  await waitFor(() => crumb("main.tsx"));
  expect(
    within(screen.getByRole("navigation", { name: "Component path" }))
      .getAllByRole("button")
      .map((button) => button.textContent)
  ).toEqual(["main.tsx", "App", "SettingsForm", "Button"]);
  expect(crumb("Button").getAttribute("aria-current")).toBe("location");

  fireEvent.click(crumb("SettingsForm"));
  await screen.findByTitle("src/settings-form.tsx:17");
  expect(crumb("SettingsForm").getAttribute("aria-current")).toBe("location");
  expect(crumb("Button").getAttribute("aria-current")).toBeNull();

  fireEvent.click(crumb("Button"));
  await screen.findByTitle("src/ui/button.tsx:9");
});

it("opens a Server Component's step in its source and never offers one the dev route cannot read", async () => {
  const picked = document.createElement("button");
  const page: FakeServerComponent = {
    debugStack: serverStack("node_modules_next.js", 100, 3),
    name: "ProfilePage",
    owner: null,
  };
  const saveButton = fakeFiber({
    createdOnServer: serverStack("app_page.js", 30, 7),
    owner: page,
    type: SaveButton,
  });
  fakeFiber({
    createdAt: site("/repo/src/save-button.tsx", 4),
    node: picked,
    owner: saveButton,
    parent: saveButton,
    type: "button",
  });
  const profilePage = sourceFile("src/app/profile/page.tsx", 12);
  answerWith({
    [`${SERVER_CHUNKS}/app_page.js`]: profilePage,
    [`${SERVER_CHUNKS}/node_modules_next.js`]: NODE_MODULES_REFUSAL,
    "/repo/src/app/profile/page.tsx": profilePage,
    "/repo/src/save-button.tsx": sourceFile("src/save-button.tsx", 4),
  });
  render(<InspectedElement element={picked} />);

  fireEvent.click(screen.getByRole("button", { name: "Inspect" }));

  await waitFor(() =>
    expect(devRoute).toHaveBeenCalledWith(
      `${SERVER_CHUNKS}/node_modules_next.js`
    )
  );
  fireEvent.click(await waitFor(() => crumb("ProfilePage")));
  await screen.findByTitle("src/app/profile/page.tsx:12");
  expect(
    within(screen.getByRole("navigation", { name: "Component path" }))
      .getAllByRole("button")
      .map((button) => button.textContent)
  ).toEqual(["ProfilePage", "SaveButton"]);
  expect(screen.queryByText(NODE_MODULES_REFUSAL)).toBeNull();
});
