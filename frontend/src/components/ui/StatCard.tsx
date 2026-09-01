import { cn } from "@/lib/utils";

export default function StatCard({
  label,
  value,
  icon,
  accent = "brand",
  sub,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "brand" | "green" | "amber" | "red" | "blue";
  sub?: string;
}) {
  const accents: Record<string, string> = {
    brand: "bg-brand-50 text-brand-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-sky-50 text-sky-700",
  };
  return (
    <div className="kpi">
      <div className="flex items-start justify-between">
        <div>
          <p className="kpi-label">{label}</p>
          <p className="kpi-value">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        {icon && (
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", accents[accent])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
