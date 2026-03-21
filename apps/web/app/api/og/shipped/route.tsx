import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const BG_CREAM = "#f5f2ed";
const TEXT_DARK = "#1a1810";
const TEXT_MUTED = "#7a7868";
const OLIVE_600 = "#5b5b4b";
const OLIVE_300 = "#d8d8d0";
const GREEN = "#22c55e";

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
        background: BG_CREAM,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter",
        position: "relative",
        padding: "60px 72px",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: "0",
          left: "0",
          right: "0",
          height: "4px",
          background: `linear-gradient(90deg, ${GREEN} 0%, ${OLIVE_300} 50%, transparent 100%)`,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "32px",
          maxWidth: "900px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: "#dcfce7",
            borderRadius: "100px",
            padding: "10px 24px",
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: GREEN,
            }}
          />
          <span
            style={{
              fontFamily: "Inter SemiBold",
              fontSize: "20px",
              color: "#166534",
            }}
          >
            Shipped
          </span>
        </div>

        <div
          style={{
            fontFamily: "Instrument Serif",
            fontSize: "64px",
            color: TEXT_DARK,
            lineHeight: 1.1,
            textAlign: "center",
            letterSpacing: "-0.02em",
          }}
        >
          {truncate(feedbackTitle, 80)}
        </div>

        {releaseTitle && (
          <div
            style={{
              fontSize: "22px",
              color: TEXT_MUTED,
              textAlign: "center",
            }}
          >
            Included in {truncate(releaseTitle, 60)}
          </div>
        )}
      </div>

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
          {orgName || "reflet.app"}
        </span>
        <span style={{ color: OLIVE_300, fontSize: "18px" }}>·</span>
        <span style={{ fontSize: "18px", color: OLIVE_600 }}>
          You asked, we shipped
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
