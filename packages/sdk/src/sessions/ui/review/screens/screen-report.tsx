import { useLayoutEffect, useRef, useState } from "react";
import { formatClock } from "../../session-format";
import { pagePath } from "../moment/moment-labels";
import type { ProposalContext } from "../proposals/proposal-details";
import { ShotCaption } from "../transcript/evidence-thumb";
import { type BoxSize, layoutCallouts } from "./callout-layout";
import { CalloutPill } from "./callout-pill";
import type { Callout, CalloutReport, CalloutScreen } from "./callout-report";

interface Measured {
  sizes: Record<string, BoxSize>;
  width: number;
}

function useMeasuredPills(measureKey: string) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const pillNodes = useRef(new Map<string, HTMLElement>());
  const [measured, setMeasured] = useState<Measured | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!(canvas && measureKey)) {
      return;
    }
    const measure = () => {
      const sizes: Record<string, BoxSize> = {};
      for (const [id, node] of pillNodes.current) {
        sizes[id] = { height: node.offsetHeight, width: node.offsetWidth };
      }
      const next = { sizes, width: canvas.clientWidth };
      setMeasured((current) =>
        JSON.stringify(current) === JSON.stringify(next) ? current : next
      );
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(canvas);
    for (const node of pillNodes.current.values()) {
      observer?.observe(node);
    }
    return () => observer?.disconnect();
  }, [measureKey]);

  const pillRef = (id: string) => (node: HTMLElement | null) => {
    if (node) {
      pillNodes.current.set(id, node);
    } else {
      pillNodes.current.delete(id);
    }
  };
  return { canvasRef, measured, pillRef };
}

function CalloutMark({
  callout,
  imageSize,
  imageTop,
}: {
  callout: Callout;
  imageSize: BoxSize;
  imageTop: number;
}) {
  const { outline, proposal } = callout;
  if (!outline) {
    return null;
  }
  return (
    <span
      aria-hidden="true"
      className="dt-ses-report-mark"
      data-decision={proposal.decision}
      style={{
        height: outline.height * imageSize.height,
        left: outline.x * imageSize.width,
        top: imageTop + outline.y * imageSize.height,
        width: outline.width * imageSize.width,
      }}
    />
  );
}

function ScreenFigure({
  context,
  newPage,
  screen,
}: {
  context: ProposalContext;
  newPage: string | null;
  screen: CalloutScreen;
}) {
  const atMs = screen.evidence.capturedAtMs ?? screen.evidence.atMs;
  const { callouts, image } = screen;
  const { canvasRef, measured, pillRef } = useMeasuredPills(
    callouts.map(({ label, proposal }) => `${proposal.id}:${label}`).join("|")
  );
  const width = measured?.width ?? 0;
  const imageSize = { height: (width * image.height) / image.width, width };
  const layout = measured
    ? layoutCallouts({
        image: imageSize,
        sizes: measured.sizes,
        targets: callouts.map(({ outline, proposal }) => ({
          id: proposal.id,
          outline,
        })),
      })
    : null;
  const imageTop = layout?.imageTop ?? 0;
  const belowImage = layout ? layout.height - imageTop - imageSize.height : 0;

  return (
    <figure className="dt-ses-report">
      <figcaption>
        <ShotCaption atMs={atMs}>
          {newPage && <code className="dt-ses-page">{newPage}</code>}
        </ShotCaption>
      </figcaption>
      <div
        className="dt-ses-report-canvas"
        data-measured={layout !== null}
        ref={canvasRef}
        style={{ paddingBottom: belowImage, paddingTop: imageTop }}
      >
        <img
          alt={`Screenshot at ${formatClock(atMs)}`}
          decoding="async"
          height={image.height}
          loading="lazy"
          src={image.url}
          width={image.width}
        />
        {layout &&
          callouts.map((callout) => (
            <CalloutMark
              callout={callout}
              imageSize={imageSize}
              imageTop={imageTop}
              key={callout.proposal.id}
            />
          ))}
        {layout && (
          <svg
            aria-hidden="true"
            className="dt-ses-report-lines"
            height={layout.height}
            width={width}
          >
            {callouts.map(({ proposal }) => {
              const line = layout.lines[proposal.id];
              return (
                line && (
                  <g data-decision={proposal.decision} key={proposal.id}>
                    <line
                      x1={line.fromX}
                      x2={line.toX}
                      y1={line.fromY}
                      y2={line.toY}
                    />
                    <circle cx={line.toX} cy={line.toY} r={3} />
                  </g>
                )
              );
            })}
          </svg>
        )}
        <ol className="dt-ses-callouts">
          {callouts.map((callout) => {
            const placed = layout?.pills[callout.proposal.id];
            return (
              <CalloutPill
                callout={callout}
                context={context}
                key={callout.proposal.id}
                pillRef={pillRef(callout.proposal.id)}
                style={placed && { left: placed.x, top: placed.y }}
              />
            );
          })}
        </ol>
      </div>
    </figure>
  );
}

export function ScreenReport({
  context,
  report,
}: {
  context: ProposalContext;
  report: CalloutReport;
}) {
  const figures = report.screens.map((screen) => ({
    page: pagePath(screen.evidence.frame?.url ?? null),
    screen,
  }));
  return (
    <>
      {figures.map(({ page, screen }, index) => (
        <ScreenFigure
          context={context}
          key={screen.evidence.id}
          newPage={figures[index - 1]?.page === page ? null : page}
          screen={screen}
        />
      ))}
      {report.unplaced.length > 0 && (
        <section className="dt-ses-block">
          <h4 className="dt-ses-label">Not on a screenshot</h4>
          <ol className="dt-ses-callouts" data-flow="list">
            {report.unplaced.map((callout) => (
              <CalloutPill
                callout={callout}
                context={context}
                key={callout.proposal.id}
              />
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
