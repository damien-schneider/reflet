import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#ffffff",
    categories: ["business", "productivity"],
    description:
      "Collect user feedback, prioritize features with voting, and share transparent roadmaps. Build products your users love.",
    display: "standalone",
    icons: [
      {
        purpose: "maskable",
        sizes: "192x192",
        src: "/web-app-manifest-192x192.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/web-app-manifest-512x512.png",
        type: "image/png",
      },
    ],
    name: "Reflet - Product Feedback & Roadmap Platform",
    orientation: "portrait-primary",
    short_name: "Reflet",
    start_url: "/",
    theme_color: "#ffffff",
  };
}
