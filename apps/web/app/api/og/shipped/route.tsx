import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { loadOgFonts } from "../og-fonts";
import {
  BG_CREAM,
  BRAND,
  BRAND_SUBTLE,
  BRAND_TEXT,
  INK_SOFT,
  RULE,
  TEXT_DARK,
  TEXT_MUTED,
} from "../og-theme";

export const runtime = "edge";

function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max - 3)}...` : str;
}

export async function GET(request: NextRequest) {
  const fonts = await loadOgFonts();

  const { searchParams } = new URL(request.url);
  const feedbackTitle = searchParams.get("feedback") ?? "Feature request";
  const releaseTitle = searchParams.get("release") ?? "";
  const orgName = searchParams.get("org") ?? "";

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
        padding: "60px 72px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background: `linear-gradient(90deg, ${BRAND} 0%, ${RULE} 50%, transparent 100%)`,
          bottom: "0",
          height: "4px",
          left: "0",
          position: "absolute",
          right: "0",
        }}
      />

      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          gap: "32px",
          maxWidth: "900px",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: BRAND_SUBTLE,
            borderRadius: "100px",
            display: "flex",
            gap: "12px",
            padding: "10px 24px",
          }}
        >
          <div
            style={{
              background: BRAND,
              borderRadius: "50%",
              height: "10px",
              width: "10px",
            }}
          />
          <span
            style={{
              color: BRAND_TEXT,
              fontFamily: "Switzer",
              fontSize: "20px",
              fontWeight: 600,
            }}
          >
            Shipped
          </span>
        </div>

        <div
          style={{
            color: TEXT_DARK,
            fontFamily: "Switzer",
            fontSize: "64px",
            fontWeight: 300,
            letterSpacing: "-0.05em",
            lineHeight: 1.1,
            textAlign: "center",
          }}
        >
          {truncate(feedbackTitle, 80)}
        </div>

        {releaseTitle && (
          <div
            style={{
              color: TEXT_MUTED,
              fontSize: "22px",
              textAlign: "center",
            }}
          >
            {`Included in ${truncate(releaseTitle, 60)}`}
          </div>
        )}
      </div>

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
          {orgName || "reflet.app"}
        </span>
        <span style={{ color: RULE, fontSize: "18px" }}>·</span>
        <span style={{ color: INK_SOFT, fontSize: "18px" }}>
          You asked, we shipped
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
