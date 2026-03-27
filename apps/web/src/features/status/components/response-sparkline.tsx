"use client";

interface SparklineProps {
  className?: string;
  data: Array<{ responseTimeMs?: number; checkedAt: number }>;
  height?: number;
}

export function ResponseSparkline({
  data,
  height = 24,
  className = "",
}: SparklineProps) {
  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-muted-foreground text-xs ${className}`}
        style={{ height }}
      >
        No data
      </div>
    );
  }

  const values = data.map((d) => d.responseTimeMs ?? 0).filter((v) => v > 0);

  if (values.length === 0) {
    return null;
  }

  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;

  const width = 120;
  const padding = 2;
  const usableHeight = height - padding * 2;
  const usableWidth = width - padding * 2;

  const points = values.map((val, i) => {
    const x = padding + (i / Math.max(values.length - 1, 1)) * usableWidth;
    const y = padding + usableHeight - ((val - minVal) / range) * usableHeight;
    return `${x},${y}`;
  });

  return (
    <svg
      aria-label="Response time sparkline"
      className={`text-olive-500 ${className}`}
      height={height}
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <polyline
        fill="none"
        points={points.join(" ")}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
