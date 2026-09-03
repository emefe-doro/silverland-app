"use client";

import { useApi } from "@/hooks/useApi";
import Badge from "@/components/ui/Badge";
import { PageLoader, EmptyState } from "@/components/ui/Spinner";
import { formatDateTime, formatDuration } from "@/lib/utils";

export default function ResidentHistoryPage() {
  const { data, loading, error } = useApi<any>("/api/resident/history");
  if (loading) return <PageLoader />;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return null;

  const logs = data.accessLogs ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">History</h1>
        <p className="text-sm text-slate-500">Your access & visitor records</p>
      </div>
      {logs.length === 0 && <EmptyState title="No history" description="Activity will appear once guests visit you." />}
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Person</th><th>Action</th><th>Entry</th><th>Exit</th><th>Duration</th></tr></thead>
            <tbody>
              {logs.map((l: any) => (
                <tr key={l.id}>
                  <td className="text-slate-700">
                    {l.visitor?.fullName || l.dispatch?.riderName || l.personType}
                    {l.dispatch && <span className="block text-xs text-slate-400">{l.dispatch.company}</span>}
                  </td>
                  <td><Badge status={l.action} /></td>
                  <td className="text-xs text-slate-500">{formatDateTime(l.entryAt)}</td>
                  <td className="text-xs text-slate-500">{l.exitAt ? formatDateTime(l.exitAt) : "—"}</td>
                  <td className="text-slate-600">{formatDuration(l.durationSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
