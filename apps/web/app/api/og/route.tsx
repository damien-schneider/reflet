import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { loadOgFonts } from "./og-fonts";
import { renderHomepageOg } from "./og-homepage";
import {
  BG_CREAM,
  INK_SOFT,
  RULE,
  RULE_STRONG,
  SURFACE,
  TEXT_DARK,
  TEXT_MUTED,
  truncate,
} from "./og-theme";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const fonts = await loadOgFonts();

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
    return renderHomepageOg(fonts);
  }

  // Page / comparison variant
  return new ImageResponse(
    <div
      style={{
        background: BG_CREAM,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Switzer",
        height: "100%",
        padding: "60px 72px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background: `linear-gradient(180deg, ${INK_SOFT}, ${RULE})`,
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
          background: `linear-gradient(90deg, ${INK_SOFT} 0%, ${RULE} 40%, transparent 100%)`,
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
            fontFamily: "Switzer",
            fontSize: "32px",
            fontWeight: 600,
            letterSpacing: "-0.03em",
          }}
        >
          Reflet.
        </div>
        {isComparison && (
          <div
            style={{
              alignItems: "center",
              background: SURFACE,
              border: `1px solid ${RULE}`,
              borderRadius: "6px",
              color: INK_SOFT,
              display: "flex",
              fontFamily: "Switzer",
              fontSize: "14px",
              fontWeight: 600,
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
            fontFamily: "Switzer",
            fontSize: `${titleFontSize}px`,
            fontWeight: 300,
            letterSpacing: "-0.05em",
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
              background: INK_SOFT,
              borderRadius: "50%",
              height: "8px",
              width: "8px",
            }}
          />
          <span
            style={{
              color: TEXT_DARK,
              fontFamily: "Switzer",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            reflet.app
          </span>
        </div>
        <span
          style={{
            color: RULE_STRONG,
            fontFamily: "Switzer",
            fontSize: "18px",
            fontStyle: "italic",
            fontWeight: 300,
          }}
        >
          Product feedback and roadmap platform
        </span>
      </div>
    </div>,
    {
      fonts,
      height: 630,
      width: 1200,
    }
  );
}
