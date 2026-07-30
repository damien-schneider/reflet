"use client";

import { ArrowClockwise, House, Warning } from "@phosphor-icons/react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <div
          role="alert"
          style={{
            alignItems: "center",
            backgroundColor: "#fafafa",
            display: "flex",
            flexDirection: "column",
            fontFamily: "system-ui, sans-serif",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              alignItems: "center",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              borderRadius: "9999px",
              display: "flex",
              height: "4rem",
              justifyContent: "center",
              width: "4rem",
            }}
          >
            <Warning
              style={{ color: "#ef4444", height: "2rem", width: "2rem" }}
              weight="fill"
            />
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h1
              style={{
                color: "#171717",
                fontSize: "1.5rem",
                fontWeight: 600,
                margin: 0,
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                color: "#737373",
                marginTop: "0.5rem",
                maxWidth: "28rem",
              }}
            >
              A critical error occurred. Please try again or return to the home
              page.
            </p>
          </div>

          {process.env.NODE_ENV === "development" && error?.message && (
            <code
              style={{
                backgroundColor: "#f5f5f5",
                borderRadius: "0.375rem",
                color: "#737373",
                fontSize: "0.875rem",
                marginTop: "1rem",
                maxWidth: "32rem",
                overflow: "auto",
                padding: "0.5rem 1rem",
              }}
            >
              {error.message}
            </code>
          )}

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              marginTop: "1.5rem",
            }}
          >
            <button
              onClick={reset}
              style={{
                alignItems: "center",
                backgroundColor: "white",
                border: "1px solid #e5e5e5",
                borderRadius: "0.5rem",
                color: "#171717",
                cursor: "pointer",
                display: "inline-flex",
                fontSize: "0.875rem",
                fontWeight: 500,
                gap: "0.375rem",
                padding: "0.5rem 1rem",
              }}
              type="button"
            >
              <ArrowClockwise style={{ height: "1rem", width: "1rem" }} />
              Try again
            </button>

            <a
              href="/"
              style={{
                alignItems: "center",
                backgroundColor: "transparent",
                border: "1px solid transparent",
                borderRadius: "0.5rem",
                color: "#737373",
                cursor: "pointer",
                display: "inline-flex",
                fontSize: "0.875rem",
                fontWeight: 500,
                gap: "0.375rem",
                padding: "0.5rem 1rem",
                textDecoration: "none",
              }}
            >
              <House style={{ height: "1rem", width: "1rem" }} />
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
