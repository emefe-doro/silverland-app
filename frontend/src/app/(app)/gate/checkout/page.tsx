"use client";

import { useState } from "react";
import QrScanner from "@/components/gate/QrScanner";
import Badge from "@/components/ui/Badge";
import { useApi } from "@/hooks/useApi";
import { useApiPost } from "@/hooks/useApi";
import { apiFetch } from "@/lib/client";
import { formatTime, formatDateTime, formatDuration } from "@/lib/utils";
import { Search, LogOut, Camera, QrCode } from "lucide-react";

type SearchRes = { visitors: any[]; residents: any[]; riders: any[]; vehicles: any[] };

function InsideRow({ v, onDone }: { v: any; onDone: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function checkout() {
    setBusy(true);
    try {
      const r = await apiFetch<any>("/api/gate/check-out", { method: "POST", body: { visitorId: v.id } });
      onDone(`Checked out ${v.fullName}. Duration: ${formatDuration(r.log?.durationSeconds)}`);
    } catch (e: any) {
      onDone(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
        {v.fullName?.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">{v.fullName}</p>
        <p className="text-xs text-slate-400">{v.vehiclePlate ? `${v.vehiclePlate} · ` : ""}in {formatTime(v.entryAt)}</p>
      </div>
      <button onClick={checkout} disabled={busy} className="btn-danger text-xs py-2">
        <LogOut className="h-4 w-4" /> Check Out
      </button>
    </li>
  );
}

export default function CheckoutPage() {
  const [q, setQ] = useState("");
  const [qrMode, setQrMode] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [outside, setOutside] = useState(0);

  const { data } = useApi<SearchRes>(q.trim() ? `/api/search?q=${encodeURIComponent(q)}` : null);
  const insideApi = useApi<any>("/api/access-logs?status=INSIDE&personType=VISITOR");

  const visitors = data?.visitors ?? [];
  const insideLogs = insideApi.data?.logs ?? [];

  async function checkoutByQr(raw: string) {
    try {
      const r = await apiFetch<any>("/api/gate/check-out", { method: "POST", body: { qr: raw } });
      setMsg(`Checked out. Duration: ${formatDuration(r.log?.durationSeconds)}`);
      setQrMode(false);
      insideApi.refetch();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Check Out</h1>

      {msg && (
        <div className="card border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{msg}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <button onClick={() => setQrMode((x) => !x)} className="btn-primary w-full">
            <QrCode className="h-5 w-5" /> Scan QR to Check Out
          </button>
          {qrMode && (
            <div className="mt-3">
              <QrScanner onScan={(t) => checkoutByQr(t)} />
            </div>
          )}
        </div>
        <div className="card p-4">
          <label className="label">Search visitor by name</label>
          <div className="flex gap-2">
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Visitor name…" />
          </div>
          {visitors.length > 0 && (
            <ul className="mt-2 space-y-2">
              {visitors.map((v: any) => (
                <InsideRow key={v.id} v={v} onDone={(m) => setMsg(m)} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-700">Currently Inside</h2>
          <Badge status="INSIDE" label={`${insideLogs.length} visitors`} />
        </div>
        {insideLogs.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">No visitors currently inside.</p>}
        <ul className="divide-y divide-slate-100">
          {insideLogs.map((log: any) => (
            <InsideRow key={log.visitor?.id ?? log.id} v={{ id: log.visitor?.id, fullName: log.visitor?.fullName ?? "Visitor", vehiclePlate: log.vehiclePlate, entryAt: log.entryAt }} onDone={(m) => setMsg(m)} />
          ))}
        </ul>
      </div>
    </div>
  );
}
