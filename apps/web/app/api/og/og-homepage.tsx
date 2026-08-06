import { ImageResponse } from "next/og";
import {
  BG_CREAM,
  OLIVE_300,
  OLIVE_400,
  OLIVE_600,
  TEXT_DARK,
  TEXT_MUTED,
} from "./og-theme";

interface OgFonts {
  instrumentData: ArrayBuffer;
  instrumentItalicData: ArrayBuffer;
  interData: ArrayBuffer;
  interSemiBoldData: ArrayBuffer;
}

export function renderHomepageOg({
  instrumentData,
  instrumentItalicData,
  interData,
  interSemiBoldData,
}: OgFonts) {
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
