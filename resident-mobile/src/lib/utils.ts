type ClassValue = string | number | false | null | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const i of inputs) {
    if (!i) continue;
    if (Array.isArray(i)) out.push(cn(...i));
    else out.push(String(i));
  }
  return out.join(" ");
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatDateTime(date?: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function formatTime(date?: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(d.getMinutes())} ${ampm}`;
}

export function formatPassCode(code: string): string {
  const clean = code.replace(/[^0-9A-Za-z]/g, "");
  if (clean.length === 6) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return code;
}

export function getTimeRemaining(expiresAt: string | Date): { expired: boolean; text: string } {
  const d = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return { expired: true, text: "Expired" };
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hrs > 0) return { expired: false, text: `Expires in ${hrs}h ${remainingMins}m` };
  return { expired: false, text: `Expires in ${mins}m` };
}
