import { describe, expect, it } from "vitest";
import {
  getFiberFromNode,
  resolveComponentStack,
  resolveSourceLocation,
} from "../react-source";

type FakeFiber = Record<string, unknown>;

function hostFiber(tag: string, parent?: FakeFiber): FakeFiber {
  return { return: parent ?? null, type: tag };
}

function componentFiber(
  component: unknown,
  parent?: FakeFiber,
  extra: FakeFiber = {}
): FakeFiber {
  return { return: parent ?? null, type: component, ...extra };
}

describe("getFiberFromNode", () => {
  it("reads the React 17+ fiber key off the DOM node", () => {
    const node = document.createElement("div");
    const fiber = { type: "div" };
    Object.defineProperty(node, "__reactFiber$abc123", { value: fiber });

    expect(getFiberFromNode(node)).toBe(fiber);
  });

  it("falls back to the React 16 internal instance key", () => {
    const node = document.createElement("div");
    const fiber = { type: "div" };
    Object.defineProperty(node, "__reactInternalInstance$x", { value: fiber });

    expect(getFiberFromNode(node)).toBe(fiber);
  });

  it("returns null for a node that React never rendered", () => {
    expect(getFiberFromNode(document.createElement("div"))).toBeNull();
  });
});

describe("resolveComponentStack", () => {
  it("collects named components and skips host elements", () => {
    function AuthLayout() {
      return null;
    }
    function LoginForm() {
      return null;
    }

    const layout = componentFiber(AuthLayout);
    const form = componentFiber(LoginForm, layout);
    const span = hostFiber("span", hostFiber("div", form));

    expect(resolveComponentStack(span)).toEqual(["LoginForm", "AuthLayout"]);
  });

  it("drops the mangled names a minified bundle hands out", () => {
    const Ur = () => null;
    const Card = () => null;

    expect(resolveComponentStack(componentFiber(Ur))).toEqual([]);
    expect(resolveComponentStack(componentFiber(Card))).toEqual(["Card"]);
  });

  it("prefers displayName over the function name", () => {
    const Card = () => null;
    Card.displayName = "ui/Card";

    expect(resolveComponentStack(componentFiber(Card))).toEqual(["ui/Card"]);
  });

  it("unwraps memo and forwardRef wrappers", () => {
    function Button() {
      return null;
    }
    function Field() {
      return null;
    }
    const memoized = { $$typeof: Symbol.for("react.memo"), type: Button };
    const forwarded = {
      $$typeof: Symbol.for("react.forward_ref"),
      render: Field,
    };

    expect(
      resolveComponentStack(componentFiber(memoized, componentFiber(forwarded)))
    ).toEqual(["Button", "Field"]);
  });

  it("skips anonymous and minified single-letter components", () => {
    const anonymous = () => null;
    Object.defineProperty(anonymous, "name", { value: "" });
    const minified = () => null;
    Object.defineProperty(minified, "name", { value: "a" });
    function RealOne() {
      return null;
    }

    expect(
      resolveComponentStack(
        componentFiber(
          anonymous,
          componentFiber(minified, componentFiber(RealOne))
        )
      )
    ).toEqual(["RealOne"]);
  });

  it("collapses repeated neighbours and caps the depth", () => {
    function Row() {
      return null;
    }
    const named = (name: string) => {
      const component = () => null;
      Object.defineProperty(component, "name", { value: name });
      return component;
    };

    let fiber: FakeFiber = componentFiber(Row);
    for (let index = 0; index < 20; index++) {
      fiber = componentFiber(named(`Level${index}`), fiber);
    }

    const stack = resolveComponentStack(fiber);

    expect(stack.length).toBeLessThanOrEqual(6);
    expect(stack[0]).toBe("Level19");
  });

  it("keeps a single entry when the same component nests in itself", () => {
    function Tree() {
      return null;
    }

    expect(
      resolveComponentStack(componentFiber(Tree, componentFiber(Tree)))
    ).toEqual(["Tree"]);
  });

  it("returns an empty stack when the fiber is missing", () => {
    expect(resolveComponentStack(null)).toEqual([]);
  });
});

describe("resolveSourceLocation", () => {
  it("reads _debugSource on React 16 to 18", () => {
    const fiber = componentFiber(
      function Login() {
        return null;
      },
      undefined,
      {
        _debugSource: {
          columnNumber: 19,
          fileName: "/Users/me/app/src/components/login-form.tsx",
          lineNumber: 46,
        },
      }
    );

    expect(resolveSourceLocation(fiber)).toBe(
      "src/components/login-form.tsx:46:19"
    );
  });

  it("parses the React 19 debug stack when it points at real source", () => {
    const error = new Error("react-stack-top-frame");
    error.stack = [
      "Error: react-stack-top-frame",
      "    at react-stack-bottom-frame (http://localhost:5173/node_modules/.vite/deps/react-dom.js:1:2)",
      "    at LoginForm (http://localhost:5173/src/components/login-form.tsx:46:19)",
    ].join("\n");

    const fiber = componentFiber(
      function Login() {
        return null;
      },
      undefined,
      {
        _debugStack: error,
      }
    );

    expect(resolveSourceLocation(fiber)).toBe(
      "src/components/login-form.tsx:46:19"
    );
  });

  it("ignores bundler chunk frames that carry no useful path", () => {
    const error = new Error("react-stack-top-frame");
    error.stack =
      "    at LoginForm (http://localhost:3000/_next/static/chunks/app/page.js:42:76)";

    const fiber = componentFiber(
      function Login() {
        return null;
      },
      undefined,
      {
        _debugStack: error,
      }
    );

    expect(resolveSourceLocation(fiber)).toBeUndefined();
  });

  it("walks up to the owner when the fiber itself has no source", () => {
    const owner = componentFiber(
      function Parent() {
        return null;
      },
      undefined,
      {
        _debugSource: {
          columnNumber: 3,
          fileName: "src/app/page.tsx",
          lineNumber: 12,
        },
      }
    );
    const fiber = componentFiber(
      function Child() {
        return null;
      },
      undefined,
      {
        _debugOwner: owner,
      }
    );

    expect(resolveSourceLocation(fiber)).toBe("src/app/page.tsx:12:3");
  });

  it("returns undefined when React exposes nothing", () => {
    expect(resolveSourceLocation(componentFiber(() => null))).toBeUndefined();
    expect(resolveSourceLocation(null)).toBeUndefined();
  });
});
