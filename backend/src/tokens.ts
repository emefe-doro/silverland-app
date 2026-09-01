import crypto from "crypto";
import QRCode from "qrcode";
import { prisma } from "./db";

export function generateSecureToken(bytes = 18): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function qrContentForToken(token: string): string {
  return `SILVERLAND:${token}`;
}

export function parseQrContent(content: string): string | null {
  const match = /^SILVERLAND:([A-Za-z0-9_-]+)$/.exec(content.trim());
  return match ? match[1] : null;
}

export async function renderQrDataUrl(content: string): Promise<string> {
  return QRCode.toDataURL(content, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
    color: { dark: "#0b3b7c", light: "#ffffff" },
  });
}
