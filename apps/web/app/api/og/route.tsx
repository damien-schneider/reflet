import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { renderHomepageOg } from "./og-homepage";
import {
  BG_CREAM,
  OLIVE_100,
  OLIVE_300,
  OLIVE_400,
  OLIVE_600,
  TEXT_DARK,
  TEXT_MUTED,
  truncate,
} from "./og-theme";

export const runtime = "edge";

// Load brand fonts (TTF files co-located with this route)
const instrumentSerifRegular = fetch(
  new URL("./InstrumentSerif-Regular.ttf", import.meta.url)
).then((res) => res.arrayBuffer());

const instrumentSerifItalic = fetch(
  new URL("./InstrumentSerif-Italic.ttf", import.meta.url)
).then((res) => res.arrayBuffer());

const interRegular = fetch(
  new URL("./Inter-Regular.ttf", import.meta.url)
).then((res) => res.arrayBuffer());

const interSemiBold = fetch(
  new URL("./Inter-SemiBold.ttf", import.meta.url)
).then((res) => res.arrayBuffer());

export async function GET(request: NextRequest) {
  const [instrumentData, instrumentItalicData, interData, interSemiBoldData] =
    await Promise.all([
      instrumentSerifRegular,
      instrumentSerifItalic,
      interRegular,
      interSemiBold,
    ]);

  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") ?? "Reflet";
  const description = searchParams.get("description") ?? "";
  const type = searchParams.get("type") ?? "page";

  const isComparison = type === "comparison";
  const isHomepage = title === "Reflet" && !description;

  let titleFontSize = 72;
  if (title.length > 60) {
    titleFontSize = 52;
  } else if (title.length > 40) {
    titleFontSize = 60;
  }

  // Homepage / brand variant — large wordmark + catch line
  if (isHomepage) {
    return renderHomepageOg({
      instrumentData,
      instrumentItalicData,
      interData,
      interSemiBoldData,
    });
  }

  // Page / comparison variant
  return new ImageResponse(
    <div
      style={{
        background: BG_CREAM,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter",
        height: "100%",
        padding: "60px 72px",
        position: "relative",
        width: "100%",
      }}
    >
      {/* Decorative olive vertical accent */}
      <div
        style={{
          background: `linear-gradient(180deg, ${OLIVE_600}, ${OLIVE_300})`,
          borderRadius: "2px",
          height: "80px",
          position: "absolute",
          right: "72px",
          top: "60px",
          width: "3px",
        }}
      />

      {/* Bottom decorative line */}
      <div
        style={{
          background: `linear-gradient(90deg, ${OLIVE_600} 0%, ${OLIVE_300} 40%, transparent 100%)`,
          bottom: "0",
          height: "4px",
          left: "0",
          position: "absolute",
          right: "0",
        }}
      />

      {/* Top: Wordmark */}
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "baseline",
            color: TEXT_DARK,
            display: "flex",
            fontFamily: "Inter SemiBold",
            fontSize: "32px",
            letterSpacing: "-0.03em",
          }}
        >
          Reflet.
        </div>
        {isComparison && (
          <div
            style={{
              alignItems: "center",
              background: OLIVE_100,
              border: `1px solid ${OLIVE_300}`,
              borderRadius: "6px",
              color: OLIVE_600,
              display: "flex",
              fontFamily: "Inter SemiBold",
              fontSize: "14px",
              gap: "6px",
              letterSpacing: "0.08em",
              padding: "5px 14px",
            }}
          >
            COMPARISON
          </div>
        )}
      </div>

      {/* Middle: Title + description */}
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          gap: "20px",
          justifyContent: "center",
          marginTop: "-20px",
          maxWidth: "950px",
        }}
      >
        <div
          style={{
            color: TEXT_DARK,
            fontFamily: "Instrument Serif",
            fontSize: `${titleFontSize}px`,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          {truncate(title, 80)}
        </div>

        {description && (
          <div
            style={{
              color: TEXT_MUTED,
              fontSize: "24px",
              lineHeight: 1.45,
              maxWidth: "900px",
            }}
          >
            {truncate(description, 120)}
          </div>
        )}
      </div>

      {/* Bottom: URL + tagline */}
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: "10px",
          }}
        >
          <div
            style={{
              background: OLIVE_600,
              borderRadius: "50%",
              height: "8px",
              width: "8px",
            }}
          />
          <span
            style={{
              color: TEXT_DARK,
              fontFamily: "Inter SemiBold",
              fontSize: "18px",
            }}
          >
            reflet.app
          </span>
        </div>
        <span
          style={{
            color: OLIVE_400,
            fontFamily: "Instrument Serif Italic",
            fontSize: "18px",
            fontStyle: "italic",
          }}
        >
          Product Feedback & Roadmap Platform
        </span>
      </div>
    </div>,
    {
      fonts: [
        {
          data: instrumentData,
          name: "Instrument Serif",
          style: "normal",
          weight: 400,
        },
        {
          data: instrumentItalicData,
          name: "Instrument Serif Italic",
          style: "italic",
          weight: 400,
        },
        {
          data: interData,
          name: "Inter",
          style: "normal",
          weight: 400,
        },
        {
          data: interSemiBoldData,
          name: "Inter SemiBold",
          style: "normal",
          weight: 600,
        },
      ],
      height: 630,
      width: 1200,
    }
  );
}
