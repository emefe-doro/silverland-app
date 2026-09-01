"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import Badge from "@/components/ui/Badge";
import { PageLoader, EmptyState } from "@/components/ui/Spinner";
import Link from "next/link";
import { UserPlus } from "lucide-react";

export default function VisitorsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const url = `/api/visitors?limit=100${q ? `&q=${encodeURIComponent(q)}` : ""}${status ? `&status=${status}` : ""}`;
  const { data, loading, error } = useApi<any>(url);

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Visitors</h1>
          <p className="text-sm text-slate-500">Registered & gate visitors</p>
        </div>
        <Link href="/visitors/register" className="btn-primary">
          <UserPlus className="h-4 w-4" /> Register Visitor
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input className="input" placeholder="Search visitors…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select sm:w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="APPROVED">Approved</option>
          <option value="PENDING">Pending</option>
          <option value="EXPECTED">Expected</option>
          <option value="DENIED">Denied</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {loading && <PageLoader />}
      {data && data.visitors.length === 0 && (
        <EmptyState title="No visitors found" description="Register a visitor to get started." />
      )}
      {data && data.visitors.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>Resident / Unit</th>
                  <th>Type</th>
                  <th>Arrival</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.visitors.map((v: any) => (
                  <tr key={v.id}>
                    <td>
                      <p className="font-medium text-slate-700">{v.fullName}</p>
                      <p className="text-xs text-slate-400">{v.phone || "—"}</p>
                    </td>
                    <td className="text-slate-600">
                      {v.resident ? `${v.resident.firstName} ${v.resident.lastName}` : "—"}
                      <span className="block text-xs text-slate-400">{v.resident?.property?.unitNumber}</span>
                    </td>
                    <td className="text-slate-600">{v.visitorType}</td>
                    <td className="text-xs text-slate-500">{v.expectedArrival ? new Date(v.expectedArrival).toLocaleString() : "—"}</td>
                    <td><Badge status={v.status} /></td>
                    <td><Link href={`/visitors/${v.id}`} className="text-sm font-medium text-brand-600 hover:underline">View</Link></td>
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
