"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import Badge from "@/components/ui/Badge";
import { PageLoader, EmptyState } from "@/components/ui/Spinner";
import { formatDateTime, formatDuration } from "@/lib/utils";

export default function AccessLogsPage() {
  const [f, setF] = useState({ personType: "", status: "", action: "", date: "", q: "" });
  const qs = new URLSearchParams(
    Object.entries(f).filter(([, v]) => v).map(([k, v]) => [k, v])
  ).toString();
  const { data, loading, error } = useApi<any>(`/api/access-logs?limit=200&${qs}`);
  const logs = data?.logs ?? [];

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const exportUrl = `/api/reports/export?format=csv${f.date ? `&date=${f.date}` : ""}${f.personType ? `&personType=${f.personType}` : ""}${f.action ? `&action=${f.action}` : ""}${f.status ? `&status=${f.status}` : ""}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Access Logs</h1>
          <p className="text-sm text-slate-500">Every entry, exit and denied attempt</p>
        </div>
        <div className="flex gap-2">
          <a href={exportUrl} className="btn-secondary text-xs" target="_blank">Export CSV</a>
          <a href={exportUrl.replace("csv", "pdf")} className="btn-secondary text-xs" target="_blank">Export PDF</a>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-5">
        <input className="input col-span-2" placeholder="Search person, plate / unit…" value={f.q} onChange={(e) => set("q", e.target.value)} />
        <select className="select" value={f.personType} onChange={(e) => set("personType", e.target.value)}>
          <option value="">All types</option><option value="VISITOR">Visitors</option><option value="DISPATCH">Dispatch</option>
        </select>
        <select className="select" value={f.action} onChange={(e) => set("action", e.target.value)}>
          <option value="">All actions</option><option value="ENTRY">Entry</option><option value="EXIT">Exit</option><option value="DENIED">Denied</option>
        </select>
        <input className="input" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
      </div>

      {loading && !data && <PageLoader />}
      {data && logs.length === 0 && <EmptyState title="No access logs" description="Adjust filters or check soon." />}
      {logs.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Resident / Unit</th>
                  <th>Vehicle</th>
                  <th>Action</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Officer</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l: any) => (
                  <tr key={l.id}>
                    <td className="text-slate-700">
                      {l.visitor?.fullName || l.dispatch?.riderName || l.personType}
                      {l.dispatch && <span className="block text-xs text-slate-400">{l.dispatch.company}</span>}
                    </td>
                    <td className="text-slate-600">
                      {l.resident ? `${l.resident.firstName} ${l.resident.lastName}` : "—"}
                      <span className="block text-xs text-slate-400">{l.property?.unitNumber}</span>
                    </td>
                    <td className="text-slate-600">{l.vehiclePlate || "—"}</td>
                    <td><Badge status={l.action} /></td>
                    <td className="text-xs text-slate-500">{formatDateTime(l.entryAt)}</td>
                    <td className="text-xs text-slate-500">{l.exitAt ? formatDateTime(l.exitAt) : "—"}</td>
                    <td className="text-xs text-slate-500">{l.securityOfficer?.name || "—"}</td>
                    <td className="text-slate-600">{formatDuration(l.durationSeconds)}</td>
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
