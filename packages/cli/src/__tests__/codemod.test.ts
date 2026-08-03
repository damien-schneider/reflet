import { describe, expect, it } from "vitest";
import { injectWidget } from "../codemod";

const IMPORT_LINE = 'import { RefletFeedback } from "reflet-sdk/feedback";';
const SNIPPET = "<RefletFeedback />";

const NEXT_LAYOUT = `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "App" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
`;

describe("injectWidget with a closing body anchor", () => {
  const inject = (source: string) =>
    injectWidget(source, {
      anchor: { kind: "before", token: "</body>" },
      importLine: IMPORT_LINE,
      snippet: SNIPPET,
    });

  it("adds the import after the existing imports", () => {
    const result = inject(NEXT_LAYOUT);

    expect(result.changed).toBe(true);
    expect(result.code).toContain(`import "./globals.css";\n${IMPORT_LINE}`);
  });

  it("renders the widget as the last child of body", () => {
    const result = inject(NEXT_LAYOUT);

    expect(result.code).toContain(
      "        {children}\n        <RefletFeedback />\n      </body>"
    );
  });

  it("splits a single line body so the widget stays inside it", () => {
    const source = `export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
`;

    const result = inject(source);

    expect(result.code).toContain(
      '      <body className="antialiased">{children}\n        <RefletFeedback />\n      </body>'
    );
    expect(result.code).not.toContain("<RefletFeedback />\n      <body");
  });

  it("keeps whatever follows the closing tag on its line", () => {
    const source = "  return <html><body>{children}</body></html>;\n";

    const result = inject(source);

    expect(result.code).toContain("</body></html>;");
    expect(result.code).toContain("  <RefletFeedback />");
  });

  it("is a no-op when the widget is already there", () => {
    const once = inject(NEXT_LAYOUT);
    const twice = inject(once.code);

    expect(twice.changed).toBe(false);
    expect(twice.reason).toBe("already-installed");
    expect(twice.code).toBe(once.code);
  });

  it("reports a missing anchor instead of guessing", () => {
    const result = inject(
      "export default function Page() {\n  return null;\n}\n"
    );

    expect(result.changed).toBe(false);
    expect(result.reason).toBe("no-anchor");
  });

  it("keeps the use client directive first", () => {
    const result = inject(`"use client";\n\n${NEXT_LAYOUT}`);

    expect(result.code.startsWith('"use client";')).toBe(true);
    expect(result.code).toContain(IMPORT_LINE);
  });

  it("adds the import at the top when the file has none", () => {
    const source =
      "export default function App() {\n  return <body></body>;\n}\n";

    const result = inject(source);

    expect(result.code.startsWith(`${IMPORT_LINE}\n`)).toBe(true);
  });
});

describe("injectWidget wrapping an element", () => {
  const inject = (source: string, token: string) =>
    injectWidget(source, {
      anchor: { kind: "wrap", token },
      importLine: IMPORT_LINE,
      snippet: SNIPPET,
    });

  it("wraps a bare page component in a fragment", () => {
    const source = `import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
`;

    const result = inject(source, "<Component {...pageProps} />");

    expect(result.code).toContain(
      "  return (\n    <>\n      <Component {...pageProps} />\n      <RefletFeedback />\n    </>\n  );"
    );
  });

  it("wraps the app element inside a nested tree", () => {
    const source = `import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

    const result = inject(source, "<App />");

    expect(result.code).toContain(
      "    <>\n      <App />\n      <RefletFeedback />\n    </>"
    );
    expect(result.code).toContain("</StrictMode>");
  });

  it("only wraps the first occurrence", () => {
    const source = "const a = <App />;\nconst b = <App />;\n";

    const result = inject(source, "<App />");

    expect(result.code.match(/RefletFeedback \/>/g)).toHaveLength(1);
  });

  it("reports a missing anchor", () => {
    const result = inject("export const x = 1;\n", "<App />");

    expect(result.changed).toBe(false);
    expect(result.reason).toBe("no-anchor");
  });
});
