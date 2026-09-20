import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
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

const instrumentSerifRegular = fetch(
  new URL("../InstrumentSerif-Regular.ttf", import.meta.url)
).then((res) => res.arrayBuffer());

const interRegular = fetch(
  new URL("../Inter-Regular.ttf", import.meta.url)
).then((res) => res.arrayBuffer());

const interSemiBold = fetch(
  new URL("../Inter-SemiBold.ttf", import.meta.url)
).then((res) => res.arrayBuffer());

function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max - 3)}...` : str;
}

export async function GET(request: NextRequest) {
  const [instrumentData, interData, interSemiBoldData] = await Promise.all([
    instrumentSerifRegular,
    interRegular,
    interSemiBold,
  ]);

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
        fontFamily: "Inter",
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
              fontFamily: "Inter SemiBold",
              fontSize: "20px",
            }}
          >
            Shipped
          </span>
        </div>

        <div
          style={{
            color: TEXT_DARK,
            fontFamily: "Instrument Serif",
            fontSize: "64px",
            letterSpacing: "-0.02em",
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
            Included in {truncate(releaseTitle, 60)}
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
            fontFamily: "Inter SemiBold",
            fontSize: "18px",
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
      fonts: [
        {
          data: instrumentData,
          name: "Instrument Serif",
          style: "normal",
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
