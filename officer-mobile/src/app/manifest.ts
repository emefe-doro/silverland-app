import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Silverland Gate Security Terminal",
    short_name: "Gate Post",
    description: "Security Officer Gate Pass Verification Terminal",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#1e40af",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
