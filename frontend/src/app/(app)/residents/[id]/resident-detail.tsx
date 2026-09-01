"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import Badge from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/client";
import { formatDateTime } from "@/lib/utils";
import { Home, Car } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ResidentDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data, loading, error, refetch } = useApi<any>(`/api/residents/${id}`);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <PageLoader />;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return null;
  const r = data.resident;

  function startEdit() {
    setForm({
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone ?? "",
      email: r.email ?? "",
      residentType: r.residentType || "OWNER",
      propertyStatus: r.propertyStatus || "ACTIVE",
      notes: r.notes ?? "",
      verified: r.verified,
    });
    setEdit(true);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await apiFetch(`/api/residents/${id}`, { method: "PUT", body: form });
      setEdit(false);
      refetch();
      setMsg("Updated.");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <button onClick={() => router.push("/residents")} className="text-sm text-brand-600 hover:underline">← Back to residents</button>

      <div className="card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-2xl font-bold text-brand-700">
            {r.firstName?.charAt(0)}{r.lastName?.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">{r.firstName} {r.lastName}</h1>
              {r.verified ? <Badge status="APPROVED" label="Verified" /> : <Badge status="PENDING" label={r.source === "NOTEBOOK_IMPORT" ? "Notebook import" : "Unverified"} />}
            </div>
            <p className="text-sm text-slate-500">{r.phone || "—"} · {r.email || "—"}</p>
            <p className="text-sm text-slate-500">{r.residentType} · {r.propertyStatus}</p>
          </div>
          <button onClick={startEdit} className="btn-secondary text-xs">Edit</button>
        </div>

        {msg && <div className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">{msg}</div>}

        {edit && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div><label className="label">First name</label><input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
            <div><label className="label">Last name</label><input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label">Email</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div>
              <label className="label">Type</label>
              <select className="select" value={form.residentType} onChange={(e) => setForm({ ...form, residentType: e.target.value })}>
                {["OWNER", "TENANT", "LANDLORD", "PERMANENT"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="select" value={form.propertyStatus} onChange={(e) => setForm({ ...form, propertyStatus: e.target.value })}>
                {["ACTIVE", "INACTIVE"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><label className="label">Notes</label><textarea className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.verified} onChange={(e) => setForm({ ...form, verified: e.target.checked })} /> Verified record
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button onClick={save} disabled={busy} className="btn-primary">Save</button>
              <button onClick={() => setEdit(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-700"><Home className="h-4 w-4 text-brand-600" /> Property</h2>
          <p className="text-lg font-semibold text-slate-700">{r.property?.unitNumber || "No unit assigned"}</p>
          <p className="text-sm text-slate-500">{r.property?.block || ""} {r.property?.propertyType || ""}</p>
          {r.user && <p className="mt-3 text-xs text-slate-400">Portal login: {r.user.email} ({r.user.isActive ? "active" : "inactive"})</p>}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-700"><Car className="h-4 w-4 text-brand-600" /> Vehicles</h2>
          {(r.vehicles ?? []).length === 0 && <p className="text-sm text-slate-400">No vehicles recorded.</p>}
          <ul className="space-y-2">
            {(r.vehicles ?? []).map((v: any) => (
              <li key={v.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold text-slate-700">{v.plateNumber}</span>
                <span className="ml-2 text-slate-400">{v.make} {v.color} {v.type}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-700">Recent Visitors</h2>
        {(r.visitors ?? []).length === 0 && <p className="text-sm text-slate-400">None.</p>}
        <ul className="divide-y divide-slate-100">
          {(r.visitors ?? []).map((v: any) => (
            <li key={v.id} className="flex items-center justify-between py-2">
              <span className="text-sm">{v.fullName}</span>
              <span className="flex items-center gap-2"><Badge status={v.status} /><span className="text-xs text-slate-400">{formatDateTime(v.createdAt)}</span></span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
