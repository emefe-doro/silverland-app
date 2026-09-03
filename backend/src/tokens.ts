import crypto from "crypto";
import QRCode from "qrcode";
import { prisma } from "./db";

export function generateSecureToken(bytes = 18): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function generateNumericCode(digits = 6): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

export function formatPassCode(code: string): string {
  const clean = code.replace(/[^0-9A-Za-z]/g, "");
  if (clean.length === 6) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return code;
}

export function cleanCodeInput(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();
  const match = /^SILVERLAND:([A-Za-z0-9_-]+)$/i.exec(s);
  if (match) s = match[1];
  return s.replace(/[^0-9A-Za-z_-]/g, "");
}

export async function generateUniqueGatePassCode(): Promise<string> {
  for (let attempt = 0; attempt < 15; attempt++) {
    const code = generateNumericCode(6);
    const existing = await prisma.gatePass.findUnique({ where: { code } });
    if (!existing) return code;
  }
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

export function qrContentForToken(token: string): string {
  return `SILVERLAND:${token}`;
}

export function parseQrContent(content: string): string | null {
  const match = /^SILVERLAND:([A-Za-z0-9_-]+)$/i.exec(content.trim());
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

