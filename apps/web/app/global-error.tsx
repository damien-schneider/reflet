"use client";

import { ArrowClockwise, Copy, House, Warning } from "@phosphor-icons/react";
import { useCallback } from "react";

import { isDevEnv, serializeError } from "@/lib/dev-error";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const payload = serializeError(error);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(payload).catch(() => {
      // ignore — best-effort copy
    });
  }, [payload]);

  return (
    <html lang="en">
      <body>
        <div
          role="alert"
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            backgroundColor: "#fafafa",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "4rem",
              height: "4rem",
              borderRadius: "9999px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
            }}
          >
            <Warning
              style={{ width: "2rem", height: "2rem", color: "#ef4444" }}
              weight="fill"
            />
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                color: "#171717",
                margin: 0,
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                marginTop: "0.5rem",
                color: "#737373",
                maxWidth: "28rem",
              }}
            >
              A critical error occurred. Please try again or return to the home
              page.
            </p>
          </div>

          {isDevEnv() && (
            <div
              style={{
                position: "relative",
                marginTop: "1rem",
                width: "100%",
                maxWidth: "40rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                backgroundColor: "#f5f5f5",
                overflow: "hidden",
                textAlign: "left",
              }}
            >
              <button
                aria-label="Copy error details"
                onClick={handleCopy}
                style={{
                  position: "absolute",
                  top: "0.5rem",
                  right: "0.5rem",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "1.75rem",
                  height: "1.75rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #e5e5e5",
                  backgroundColor: "white",
                  color: "#737373",
                  cursor: "pointer",
                }}
                type="button"
              >
                <Copy style={{ width: "0.875rem", height: "0.875rem" }} />
              </button>
              <pre
                style={{
                  margin: 0,
                  padding: "0.75rem",
                  paddingRight: "3rem",
                  maxHeight: "18rem",
                  overflow: "auto",
                  fontSize: "0.75rem",
                  lineHeight: 1.6,
                  color: "#525252",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {payload}
              </pre>
            </div>
          )}

          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: "0.75rem",
            }}
          >
            <button
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#171717",
                backgroundColor: "white",
                border: "1px solid #e5e5e5",
                borderRadius: "0.5rem",
                cursor: "pointer",
              }}
              type="button"
            >
              <ArrowClockwise style={{ width: "1rem", height: "1rem" }} />
              Try again
            </button>

            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#737373",
                backgroundColor: "transparent",
                border: "1px solid transparent",
                borderRadius: "0.5rem",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              <House style={{ width: "1rem", height: "1rem" }} />
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
