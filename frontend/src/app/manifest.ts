import { MetadataRoute } from "next";
import { APP_NAME, APP_SUBTITLE } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: "Silverland",
    description: `${APP_NAME} (${APP_SUBTITLE}) — estate access control.`,
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8fb",
    theme_color: "#0b3b7c",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
