"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { PageLoader } from "@/components/ui/Spinner";
import { Download } from "lucide-react";

export default function ReportsPage() {
  const [days, setDays] = useState(7);
  const [type, setType] = useState("all");
  const [group, setGroup] = useState("day");
  const { data, loading, error } = useApi<any>(
    `/api/reports?days=${days}&type=${type}&group=${group}`
  );

  const exportUrl = `/api/reports/export?format=csv&date=` ;
  const series = data?.series ?? [];
  const totals = data?.totals ?? {};
  const max = Math.max(1, ...series.map((s: any) => s.total));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-sm text-slate-500">Usage analytics across the estate</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/reports/export?format=csv`} className="btn-secondary text-xs" target="_blank"><Download className="h-4 w-4" /> CSV</a>
          <a href={`/api/reports/export?format=pdf`} className="btn-secondary text-xs" target="_blank"><Download className="h-4 w-4" /> PDF</a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select className="select w-40" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 14, 30, 90].map((d) => <option key={d} value={d}>{d} days</option>)}
        </select>
        <select className="select w-44" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All activity</option><option value="visitors">Visitors</option><option value="dispatch">Dispatch riders</option>
        </select>
        <select className="select w-44" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option>
        </select>
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {loading && !data && <PageLoader />}

      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="kpi"><p className="kpi-label">Total records</p><p className="kpi-value">{totals.total}</p></div>
          <div className="kpi"><p className="kpi-label">Entries</p><p className="kpi-value">{totals.entered}</p></div>
          <div className="kpi"><p className="kpi-label">Denied</p><p className="kpi-value">{totals.denied}</p></div>
        </div>
      )}

      {data && (
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-slate-700">{group === "week" ? "Weekly" : group === "month" ? "Monthly" : "Daily"} trend</h2>
          <div className="flex items-end gap-2 overflow-x-auto pb-2">
            {series.map((s: any) => (
              <div key={s.label} className="flex flex-col items-center">
                <div className="flex h-32 w-12 items-end rounded bg-slate-50">
                  <div className="w-full rounded-t bg-brand-500" style={{ height: `${(s.total / max) * 100}%` }} title={`${s.label}: ${s.total}`} />
                </div>
                <span className="mt-1 text-[10px] text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Period</th><th>Total</th><th>Entries</th><th>Exits</th><th>Denied</th><th>Dispatch</th><th>Vehicles</th></tr>
              </thead>
              <tbody>
                {series.map((s: any) => (
                  <tr key={s.label}>
                    <td className="font-medium text-slate-700">{s.label}</td>
                    <td>{s.total}</td><td>{s.entered}</td><td>{s.exited}</td><td>{s.denied}</td><td>{s.dispatch}</td><td>{s.vehicles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
