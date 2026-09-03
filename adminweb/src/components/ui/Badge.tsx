import { cn } from "@/lib/utils";

const MAP: Record<string, string> = {
  // Green
  APPROVED: "badge-green",
  INSIDE: "badge-green",
  ACTIVE: "badge-green",
  ENTRY: "badge-green",
  EXPECTED: "badge-green",
  EXITED: "badge-blue",
  // Red
  DENIED: "badge-red",
  CANCELLED: "badge-red",
  EXPIRED: "badge-red",
  REVOKED: "badge-red",
  // Orange
  PENDING: "badge-orange",
  UNEXPECTED: "badge-orange",
  // Blue
  EXIT: "badge-blue",
  INFORMATION: "badge-blue",
  // Gray
  USED: "badge-gray",
  UNKNOWN: "badge-gray",
};

export default function Badge({ status, label }: { status: string; label?: string }) {
  const cls = MAP[status.toUpperCase()] ?? "badge-gray";
  return (
    <span className={cn(cls)}>
      {label ?? status.replace("_", " ")}
    </span>
  );
}
