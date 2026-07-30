import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

// Brand colors from globals.css
const BG_CREAM = "#f5f2ed";
const TEXT_DARK = "#1a1810";
const TEXT_MUTED = "#7a7868";
const OLIVE_600 = "#5b5b4b";
const OLIVE_400 = "#abab9c";
const OLIVE_300 = "#d8d8d0";
const OLIVE_100 = "#f4f4f0";

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

function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max - 3)}...` : str;
}

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
    return new ImageResponse(
      <div
        style={{
          alignItems: "center",
          background: BG_CREAM,
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter",
          height: "100%",
          justifyContent: "center",
          position: "relative",
          width: "100%",
        }}
      >
        {/* Bottom decorative line */}
        <div
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${OLIVE_600} 30%, ${OLIVE_600} 70%, transparent 100%)`,
            bottom: "0",
            height: "4px",
            left: "0",
            position: "absolute",
            right: "0",
          }}
        />

        {/* Main content — centered */}
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: "28px",
          }}
        >
          <div
            style={{
              color: TEXT_DARK,
              fontFamily: "Instrument Serif",
              fontSize: "160px",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            Reflet.
          </div>

          <div
            style={{
              alignItems: "center",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div
              style={{
                color: TEXT_MUTED,
                fontFamily: "Instrument Serif Italic",
                fontSize: "36px",
                fontStyle: "italic",
                lineHeight: 1.3,
              }}
            >
              Your users are talking.
            </div>
            <div
              style={{
                color: OLIVE_400,
                fontFamily: "Instrument Serif Italic",
                fontSize: "36px",
                fontStyle: "italic",
                lineHeight: 1.3,
              }}
            >
              Are you listening?
            </div>
          </div>
        </div>

        {/* Bottom: URL */}
        <div
          style={{
            alignItems: "center",
            bottom: "28px",
            display: "flex",
            gap: "10px",
            position: "absolute",
          }}
        >
          <div
            style={{
              background: OLIVE_600,
              borderRadius: "50%",
              height: "6px",
              width: "6px",
            }}
          />
          <span
            style={{
              color: TEXT_MUTED,
              fontFamily: "Inter SemiBold",
              fontSize: "18px",
            }}
          >
            reflet.app
          </span>
          <span style={{ color: OLIVE_300, fontSize: "18px" }}>·</span>
          <span
            style={{
              color: OLIVE_400,
              fontSize: "18px",
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
