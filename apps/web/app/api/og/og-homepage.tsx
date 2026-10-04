import { ImageResponse } from "next/og";
import type { OgFonts } from "./og-fonts";
import {
  BG_CREAM,
  INK_SOFT,
  RULE,
  RULE_STRONG,
  TEXT_DARK,
  TEXT_MUTED,
} from "./og-theme";

export function renderHomepageOg(fonts: OgFonts) {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: BG_CREAM,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Switzer",
        height: "100%",
        justifyContent: "center",
        position: "relative",
        width: "100%",
      }}
    >
      {/* Bottom decorative line */}
      <div
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${INK_SOFT} 30%, ${INK_SOFT} 70%, transparent 100%)`,
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
            fontFamily: "Switzer",
            fontSize: "160px",
            fontWeight: 300,
            letterSpacing: "-0.05em",
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
              fontFamily: "Switzer",
              fontSize: "36px",
              fontStyle: "italic",
              fontWeight: 300,
              lineHeight: 1.3,
            }}
          >
            Your users are talking.
          </div>
          <div
            style={{
              color: RULE_STRONG,
              fontFamily: "Switzer",
              fontSize: "36px",
              fontStyle: "italic",
              fontWeight: 300,
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
            background: INK_SOFT,
            borderRadius: "50%",
            height: "6px",
            width: "6px",
          }}
        />
        <span
          style={{
            color: TEXT_MUTED,
            fontFamily: "Switzer",
            fontSize: "18px",
            fontWeight: 600,
          }}
        >
          reflet.app
        </span>
        <span style={{ color: RULE, fontSize: "18px" }}>·</span>
        <span
          style={{
            color: RULE_STRONG,
            fontSize: "18px",
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
