"use client";

import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/client";
import Badge from "@/components/ui/Badge";
import { PageLoader, EmptyState } from "@/components/ui/Spinner";
import Link from "next/link";
import { UserPlus, CalendarCheck } from "lucide-react";

export default function ResidentVisitorsPage() {
  const { data, loading, error, refetch } = useApi<any>("/api/visitors?limit=100");
  const visitors = data?.visitors ?? [];

  async function toggleExpected(v: any) {
    await apiFetch(`/api/visitors/${v.id}/expected`, {
      method: "POST",
      body: { expected: v.status !== "EXPECTED" },
    });
    refetch();
  }

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Visitors</h1>
          <p className="text-sm text-slate-500">Pre-registered visitors requesting to visit you</p>
        </div>
        <Link href="/resident/register-visitor" className="btn-primary"><UserPlus className="h-4 w-4" /> New</Link>
      </div>
      {loading && !data && <PageLoader />}
      {data && visitors.length === 0 && <EmptyState title="No visitors yet" description="Pre-register a visitor so they get a QR pass." />}
      <div className="space-y-2">
        {visitors.map((v: any) => (
          <div key={v.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-lg font-bold text-brand-700">{v.fullName?.charAt(0)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-700">{v.fullName}</p>
                <Badge status={v.status} />
              </div>
              <p className="text-sm text-slate-500">{v.visitorType} · {v.purpose || "visit"} {v.vehiclePlate ? `· ${v.vehiclePlate}` : ""}</p>
              <p className="text-xs text-slate-400">{v.phone || "—"} · {v.expectedArrival ? new Date(v.expectedArrival).toLocaleString() : "no date"}</p>
            </div>
            <div className="flex gap-2">
              {v.status === "PENDING" && (
                <Link href={`/visitors/${v.id}`} className="btn-success text-xs"><CalendarCheck className="h-4 w-4" /> Approve</Link>
              )}
              <button onClick={() => toggleExpected(v)} className="btn-secondary text-xs">{v.status === "EXPECTED" ? "Unexpected" : "Expected"}</button>
              <Link href={`/visitors/${v.id}`} className="btn-ghost text-xs">Pass</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
