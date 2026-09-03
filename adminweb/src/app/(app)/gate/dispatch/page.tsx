"use client";

import { useState } from "react";
import DispatchForm from "@/components/forms/DispatchForm";
import Badge from "@/components/ui/Badge";
import { apiFetch } from "@/lib/client";
import { Bike, CheckCircle2, DoorOpen } from "lucide-react";

export default function GateDispatchPage() {
  const [created, setCreated] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function approveAndEnter() {
    if (!created) return;
    setBusy(true);
    setMsg(null);
    try {
      await apiFetch(`/api/dispatch/${created.rider.id}/confirm`, { method: "POST" });
      await apiFetch(`/api/dispatch/${created.rider.id}/entry`, { method: "POST" });
      setMsg("Rider approved and recorded as INSIDE.");
      setCreated((c: any) => ({ ...c, rider: { ...c.rider, status: "INSIDE" } }));
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Dispatch Rider Registered</h2>
            <Badge status={created.rider.status} />
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-slate-700">{created.rider.riderName}</p>
            <p className="text-slate-500">{created.rider.company || "Dispatch"} · Ref: {created.rider.orderReference || "—"}</p>
            <p className="mt-1 text-slate-500">Bike: {created.rider.bikeNumber || "—"}</p>
            <p className="text-xs text-slate-400 mt-1">Pass token: {created.rider.passToken?.slice(0, 16)}</p>
          </div>
          {msg && <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">{msg}</div>}
          <div className="flex gap-2">
            <button onClick={approveAndEnter} disabled={busy || created.rider.status === "INSIDE"} className="btn-success flex-1 py-3">
              <DoorOpen className="h-5 w-5" /> Approve &amp; Record Entry
            </button>
            <button onClick={() => setCreated(null)} className="btn-secondary py-3">Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-slate-800">Register Dispatch Rider</h1>
      <DispatchForm onSuccess={(res) => setCreated(res)} submitLabel="Register Rider" />
    </div>
  );
}
