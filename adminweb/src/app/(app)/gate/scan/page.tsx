"use client";

import { useState } from "react";
import QrScanner from "@/components/gate/QrScanner";
import Badge from "@/components/ui/Badge";
import { useApiPost } from "@/hooks/useApi";
import { formatDateTime, formatTime } from "@/lib/utils";
import { CheckCircle2, XCircle, ShieldAlert, Camera } from "lucide-react";

type Resolve = {
  parsed: boolean;
  allowed: boolean;
  reason?: string;
  pass: { status: string; expiresAt: string; usesCount: number; maxUses: number } | null;
  visitor: {
    id: string;
    fullName: string;
    phone: string;
    visitorType: string;
    purpose: string;
    status: string;
    vehiclePlate: string;
  } | null;
  resident: { name: string; unitNumber: string } | null;
};

export default function ScanPage() {
  const [raw, setRaw] = useState("");
  const [resolved, setResolved] = useState<Resolve | null>(null);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [camOn, setCamOn] = useState(false);
  const resolveApi = useApiPost<Resolve>("/api/gate/resolve");
  const entry = useApiPost<any>("/api/gate/check-in");
  const deny = useApiPost<any>("/api/gate/deny");

  async function resolve(rawText: string) {
    setRaw(rawText);
    setResult(null);
    try {
      const r = await resolveApi.run({ qr: rawText });
      setResolved(r);
    } catch (e: any) {
      setResolved(null);
      setResult({ ok: false, msg: e.message });
    }
  }

  async function grantEntry() {
    try {
      await entry.run({ qr: raw });
      setResult({ ok: true, msg: "Entry recorded. Visitor is now INSIDE." });
      setResolved({ ...(resolved as Resolve), allowed: true, visitor: { ...(resolved as any).visitor, status: "APPROVED" } });
    } catch (e: any) {
      setResult({ ok: false, msg: e.message });
    }
  }

  async function logDenied() {
    try {
      await deny.run({ qr: raw, reason: resolved?.reason || "Scanner denied" });
      setResult({ ok: true, msg: "Denied attempt recorded in the audit log." });
    } catch (e: any) {
      setResult({ ok: false, msg: e.message });
    }
  }

  function reset() {
    setRaw("");
    setResolved(null);
    setResult(null);
    setCamOn(false);
  }

  const v = resolved?.visitor;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Scan QR Code</h1>
        <button onClick={reset} className="btn-ghost text-xs">Reset</button>
      </div>

      {!resolved && !result && (
        <>
          <div className="card p-4">
            <p className="mb-2 text-sm text-slate-500">
              Point the camera at the visitor&apos;s QR pass, or type the pass code below.
            </p>
            <button onClick={() => setCamOn((x) => !x)} className="btn-primary w-full">
              <Camera className="h-5 w-5" /> {camOn ? "Refresh Camera" : "Start Camera"}
            </button>
            {camOn && (
              <div className="mt-3">
                <QrScanner onScan={(txt) => { setCamOn(false); resolve(txt); }} />
              </div>
            )}
          </div>
          <div className="card p-4">
            <label className="label">Or enter pass code manually</label>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="e.g. SILVERLAND:xxxx"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
              />
              <button className="btn-primary" onClick={() => resolve(raw.trim())}>Verify</button>
            </div>
          </div>
        </>
      )}

      {resolved && (
        <div className="card overflow-hidden">
          <div className={`px-4 py-3 text-sm font-semibold text-white ${resolved.allowed ? "bg-emerald-600" : "bg-red-600"}`}>
            {resolved.allowed ? "PASS VALID — GRANTING ACCESS" : "ACCESS DENIED"}
          </div>
          <div className="space-y-3 p-4">
            {resolved.reason && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{resolved.reason}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-xl font-bold text-brand-700">
                {v ? v.fullName.charAt(0) : "?"}
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">{v?.fullName || "Unknown"}</p>
                <p className="text-sm text-slate-500">{v?.phone || "—"}</p>
              </div>
              {v && <div className="ml-auto"><Badge status={v.status} /></div>}
            </div>

            {v && (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-slate-400">Resident</dt><dd className="font-medium text-slate-700">{resolved.resident?.name || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Unit</dt><dd className="font-medium text-slate-700">{resolved.resident?.unitNumber || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Purpose</dt><dd className="font-medium text-slate-700">{v.purpose || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Vehicle</dt><dd className="font-medium text-slate-700">{v.vehiclePlate || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Type</dt><dd className="font-medium text-slate-700">{v.visitorType}</dd></div>
                <div><dt className="text-xs text-slate-400">Arrival</dt><dd className="font-medium text-slate-700">{formatTime(resolved.pass?.expiresAt)}</dd></div>
                <div><dt className="text-xs text-slate-400">Pass expires</dt><dd className="font-medium text-slate-700">{formatDateTime(resolved.pass?.expiresAt)}</dd></div>
              </dl>
            )}

            <div className="flex gap-2 pt-2">
              {resolved.allowed && (
                <button onClick={grantEntry} disabled={entry.busy} className="btn-success flex-1 py-4">
                  <CheckCircle2 className="h-5 w-5" /> RECORD ENTRY
                </button>
              )}
              {!resolved.allowed && (
                <button onClick={logDenied} disabled={deny.busy} className="btn-secondary flex-1 py-4">
                  <XCircle className="h-5 w-5" /> LOG DENIED ATTEMPT
                </button>
              )}
              <button onClick={reset} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className={`card p-4 text-sm font-medium ${result.ok ? "text-emerald-700" : "text-red-700"}`}>
          {result.msg}
          <div className="mt-3"><button onClick={reset} className="btn-secondary">Scan Next</button></div>
        </div>
      )}
    </div>
  );
}
