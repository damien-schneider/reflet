export function MissingRouteHint({ purpose }: { purpose: string }) {
  return (
    <div className="dt-empty">
      <p>Add the Reflet dev route to {purpose}.</p>
      <p>
        Next.js: <code>app/api/reflet-devtools/[...path]/route.ts</code>
        <br />
        <code>export {"{ GET, POST }"} from "reflet-sdk/devtools/next";</code>
      </p>
      <p>
        Vite: <code>plugins: [refletDevtools()]</code> from{" "}
        <code>reflet-sdk/devtools/vite</code>
      </p>
    </div>
  );
}

export const MISSING_SECRET_KEY_HINT =
  "Set REFLET_SECRET_KEY (your fb_sec_ key) in the dev server environment to reach your board.";
