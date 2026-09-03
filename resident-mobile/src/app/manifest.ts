import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Silverland Resident Access",
    short_name: "Resident Pass",
    description: "Resident Gate Pass Generator for Silverland Estate",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b3b7c",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
