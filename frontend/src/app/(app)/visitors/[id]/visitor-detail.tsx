"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/client";
import Badge from "@/components/ui/Badge";
import QrImage from "@/components/ui/QrImage";
import { PageLoader } from "@/components/ui/Spinner";
import { formatDateTime, formatDuration } from "@/lib/utils";
import { CheckCheck, X, RefreshCw, CalendarCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function VisitorDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data, loading, error, refetch } = useApi<any>(`/api/visitors/${id}`);
  const passApi = useApi<any>(`/api/visitors/${id}/pass`);
  const [busy, setBusy] = useState<null | string>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (passApi.data) setQr(passApi.data.qrDataUrl);
  }, [passApi.data]);

  async function act(action: string, body: any = {}) {
    setBusy(action);
    setMessage(null);
    try {
      await apiFetch(`/api/visitors/${id}/${action}`, { method: "POST", body });
      if (action === "pass") {
        setQr(null);
        passApi.refetch();
      }
      setMessage("Done.");
      refetch();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <PageLoader />;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return null;
  const v = data.visitor;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <button onClick={() => router.push("/visitors")} className="text-sm text-brand-600 hover:underline">← Back to visitors</button>

      <div className="card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-2xl font-bold text-brand-700">
            {v.fullName?.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">{v.fullName}</h1>
              <Badge status={v.status} />
            </div>
            <p className="text-sm text-slate-500">{v.phone || "No phone"} · {v.visitorType}</p>
            <p className="text-sm text-slate-500">
              Visiting {v.resident ? `${v.resident.firstName} ${v.resident.lastName}` : "—"} {v.resident?.property ? `· ${v.resident.property.unitNumber}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {v.status === "PENDING" && <button onClick={() => act("approve")} disabled={busy !== null} className="btn-success text-xs"><CheckCheck className="h-4 w-4" /> Approve</button>}
            <button onClick={() => act("deny", { reason: "Denied by officer" })} disabled={busy !== null} className="btn-danger text-xs"><X className="h-4 w-4" /> Deny</button>
            <button onClick={() => act("expected", { expected: v.status === "EXPECTED" })} disabled={busy !== null} className="btn-secondary text-xs"><CalendarCheck className="h-4 w-4" /> {v.status === "EXPECTED" ? "Mark unexpected" : "Mark expected"}</button>
            <button onClick={() => act("cancel")} disabled={busy !== null} className="btn-secondary text-xs"><Trash2 className="h-4 w-4" /> Cancel</button>
          </div>
        </div>

        {message && <div className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">{message}</div>}

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-slate-400">Purpose</dt><dd className="font-medium text-slate-700">{v.purpose || "—"}</dd></div>
          <div><dt className="text-xs text-slate-400">Vehicle plate</dt><dd className="font-medium text-slate-700">{v.vehiclePlate || "—"} {v.vehicleType ? `(${v.vehicleType})` : ""}</dd></div>
          <div><dt className="text-xs text-slate-400">Expected date</dt><dd className="font-medium text-slate-700">{formatDateTime(v.expectedDate)}</dd></div>
          <div><dt className="text-xs text-slate-400">Arrival → departure</dt><dd className="font-medium text-slate-700">{v.expectedArrival ? new Date(v.expectedArrival).toLocaleTimeString() : "—"} → {v.expectedDeparture ? new Date(v.expectedDeparture).toLocaleTimeString() : "—"}</dd></div>
        </dl>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card flex flex-col items-center p-6 text-center">
          <h2 className="mb-3 font-semibold text-slate-700">Digital Access Pass</h2>
          {qr ? <QrImage dataUrl={qr} size={208} /> : <div className="flex h-52 w-52 items-center justify-center"><PageLoader /></div>}
          <button onClick={() => act("pass")} disabled={busy !== null} className="btn-secondary mt-4 text-xs"><RefreshCw className="h-4 w-4" /> Regenerate QR / Pass</button>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-700">Access History</h2>
          {(v.accessLogs ?? []).length === 0 && <p className="text-sm text-slate-400">No access records yet.</p>}
          <ul className="space-y-3">
            {(v.accessLogs ?? []).map((l: any) => (
              <li key={l.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <Badge status={l.action} />
                <div className="flex-1 text-xs text-slate-500">
                  <p>{formatDateTime(l.entryAt)}{l.exitAt ? ` → ${formatDateTime(l.exitAt)}` : ""}</p>
                  <p>{l.vehiclePlate ? l.vehiclePlate + " · " : ""}{l.securityOfficer?.name || "—"}</p>
                </div>
                <span className="text-sm font-semibold text-slate-600">{formatDuration(l.durationSeconds)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
