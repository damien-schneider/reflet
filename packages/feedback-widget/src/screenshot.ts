/**
 * Captures a screenshot of the current page using the native Canvas API.
 * Falls back gracefully if the page cannot be captured.
 */
export async function capturePageScreenshot(): Promise<Blob | null> {
  try {
    // Use html2canvas-style approach: render the page to a canvas
    // We use a simpler approach - capture the visible viewport
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Try to use the experimental ScreenCapture API if available
    // For privacy reasons, this requires user interaction
    // So we fall back to creating a screenshot from the DOM

    // Simple approach: serialize the visible page HTML to SVG foreignObject
    const html = document.documentElement.outerHTML;
    const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
      </foreignObject>
    </svg>`;

    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    return await new Promise<Blob | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/png",
          0.9
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch {
    return null;
  }
}

/**
 * Convert a File or clipboard image to a Blob for upload.
 */
export function fileToBlob(file: File): Blob {
  return file.slice(0, file.size, file.type);
}

/**
 * Gets the current page URL (sanitized - no tokens/params that might leak).
 */
export function getPageUrl(): string {
  const url = new URL(window.location.href);
  // Keep only the path, strip query params that might contain sensitive data
  return `${url.origin}${url.pathname}`;
}
