import type { SegmentContext } from "../../../protocol";
import { pagePath } from "./moment-labels";

export function ContextLine({ item }: { item: SegmentContext }) {
  const page = pagePath(item.url ?? item.frame?.url ?? null);
  return (
    <>
      {item.element?.label ?? item.label}
      {page && (
        <>
          {" · "}
          <code className="dt-ses-page">{page}</code>
        </>
      )}
    </>
  );
}
