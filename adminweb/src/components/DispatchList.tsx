"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import Badge from "@/components/ui/Badge";
import { PageLoader, EmptyState } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/client";
import Link from "next/link";
import { Bike } from "lucide-react";
import { formatTime, formatDateTime } from "@/lib/utils";

export default function DispatchList({ filter = "" }: { filter?: string }) {
  const q = filter ? `&status=${filter}` : "";
  const { data, loading, error, refetch } = useApi<any>(`/api/dispatch?limit=100${q}`);
  const [msg, setMsg] = useState<string | null>(null);

  async function act(id: string, action: string) {
    setMsg(null);
    try {
      const r = await apiFetch<any>(`/api/dispatch/${id}/${action}`, { method: "POST" });
      setMsg(r.ok ? `Rider updated.` : r.reason || "Done.");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      refetch();
    }
  }

  if (loading && !data) return <PageLoader />;
  if (error) return <p className="text-red-600">{error}</p>;
  const riders = data?.dispatch ?? [];

  return (
    <div className="space-y-3">
      {msg && <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">{msg}</div>}
      {riders.length === 0 && <EmptyState title="No dispatch riders" description="Register a dispatch rider at the gate or from your portal." />}
      {riders.map((r: any) => (
        <div key={r.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Bike className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-700">{r.riderName}</p>
              <Badge status={r.status} />
            </div>
            <p className="text-sm text-slate-500">
              {r.company || "Dispatch"} · Ref: {r.orderReference || "—"}
            </p>
            <p className="text-xs text-slate-400">
              {r.bikeNumber ? `${r.bikeNumber} · ` : ""}{r.resident ? `${r.resident.firstName} ${r.resident.lastName}` : ""}{r.resident?.property ? ` · ${r.resident.property.unitNumber}` : ""}
              {r.expiresAt ? ` · exp ${formatTime(r.expiresAt)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {r.status === "PENDING" && <button onClick={() => act(r.id, "confirm")} className="btn-success text-xs"><Bike className="h-4 w-4" /> Confirm &amp; Approve</button>}
            {r.status === "APPROVED" && <button onClick={() => act(r.id, "entry")} className="btn-primary text-xs">Record Entry</button>}
            {r.status === "INSIDE" && <button onClick={() => act(r.id, "exit")} className="btn-danger text-xs">Record Exit</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
