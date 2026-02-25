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
          background: BG_CREAM,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter",
          position: "relative",
        }}
      >
        {/* Bottom decorative line */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            height: "4px",
            background: `linear-gradient(90deg, transparent 0%, ${OLIVE_600} 30%, ${OLIVE_600} 70%, transparent 100%)`,
          }}
        />

        {/* Main content — centered */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "28px",
          }}
        >
          <div
            style={{
              fontFamily: "Instrument Serif",
              fontSize: "160px",
              color: TEXT_DARK,
              lineHeight: 1,
              letterSpacing: "-0.03em",
            }}
          >
            Reflet.
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                fontFamily: "Instrument Serif Italic",
                fontSize: "36px",
                color: TEXT_MUTED,
                fontStyle: "italic",
                lineHeight: 1.3,
              }}
            >
              Your users are talking.
            </div>
            <div
              style={{
                fontFamily: "Instrument Serif Italic",
                fontSize: "36px",
                color: OLIVE_400,
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
            position: "absolute",
            bottom: "28px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: OLIVE_600,
            }}
          />
          <span
            style={{
              fontFamily: "Inter SemiBold",
              fontSize: "18px",
              color: TEXT_MUTED,
            }}
          >
            reflet.app
          </span>
          <span style={{ color: OLIVE_300, fontSize: "18px" }}>·</span>
          <span
            style={{
              fontSize: "18px",
              color: OLIVE_400,
            }}
          >
            Product Feedback & Roadmap Platform
          </span>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Instrument Serif",
            data: instrumentData,
            style: "normal",
            weight: 400,
          },
          {
            name: "Instrument Serif Italic",
            data: instrumentItalicData,
            style: "italic",
            weight: 400,
          },
          {
            name: "Inter",
            data: interData,
            style: "normal",
            weight: 400,
          },
          {
            name: "Inter SemiBold",
            data: interSemiBoldData,
            style: "normal",
            weight: 600,
          },
        ],
      }
    );
  }

  // Page / comparison variant
  return new ImageResponse(
    <div
      style={{
        background: BG_CREAM,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "60px 72px",
        fontFamily: "Inter",
        position: "relative",
      }}
    >
      {/* Decorative olive vertical accent */}
      <div
        style={{
          position: "absolute",
          top: "60px",
          right: "72px",
          width: "3px",
          height: "80px",
          background: `linear-gradient(180deg, ${OLIVE_600}, ${OLIVE_300})`,
          borderRadius: "2px",
        }}
      />

      {/* Bottom decorative line */}
      <div
        style={{
          position: "absolute",
          bottom: "0",
          left: "0",
          right: "0",
          height: "4px",
          background: `linear-gradient(90deg, ${OLIVE_600} 0%, ${OLIVE_300} 40%, transparent 100%)`,
        }}
      />

      {/* Top: Wordmark */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontFamily: "Inter SemiBold",
            fontSize: "32px",
            color: TEXT_DARK,
            letterSpacing: "-0.03em",
          }}
        >
          Reflet.
        </div>
        {isComparison && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: OLIVE_100,
              border: `1px solid ${OLIVE_300}`,
              borderRadius: "6px",
              padding: "5px 14px",
              fontFamily: "Inter SemiBold",
              fontSize: "14px",
              color: OLIVE_600,
              letterSpacing: "0.08em",
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
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: "20px",
          maxWidth: "950px",
          marginTop: "-20px",
        }}
      >
        <div
          style={{
            fontFamily: "Instrument Serif",
            fontSize: `${titleFontSize}px`,
            color: TEXT_DARK,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {truncate(title, 80)}
        </div>

        {description && (
          <div
            style={{
              fontSize: "24px",
              color: TEXT_MUTED,
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: OLIVE_600,
            }}
          />
          <span
            style={{
              fontFamily: "Inter SemiBold",
              fontSize: "18px",
              color: TEXT_DARK,
            }}
          >
            reflet.app
          </span>
        </div>
        <span
          style={{
            fontFamily: "Instrument Serif Italic",
            fontSize: "18px",
            color: OLIVE_400,
            fontStyle: "italic",
          }}
        >
          Product Feedback & Roadmap Platform
        </span>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Instrument Serif",
          data: instrumentData,
          style: "normal",
          weight: 400,
        },
        {
          name: "Instrument Serif Italic",
          data: instrumentItalicData,
          style: "italic",
          weight: 400,
        },
        {
          name: "Inter",
          data: interData,
          style: "normal",
          weight: 400,
        },
        {
          name: "Inter SemiBold",
          data: interSemiBoldData,
          style: "normal",
          weight: 600,
        },
      ],
    }
  );
}
