import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME, APP_SUBTITLE } from "@/lib/constants";
import PwaRegister from "@/components/layout/PwaRegister";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Access Control`,
    template: `%s · ${APP_NAME}`,
  },
  description: `${APP_NAME} (${APP_SUBTITLE}) access control and estate security system.`,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b3b7c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
