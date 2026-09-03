"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import Badge from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/client";
import { formatDateTime } from "@/lib/utils";
import { Home, Car, ShieldBan, ShieldCheck, Trash2, AlertTriangle, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ResidentDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data, loading, error, refetch } = useApi<any>(`/api/residents/${id}`);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
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
      setMsg({ type: "success", text: "Resident details updated successfully." });
    } catch (e: any) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleSuspendAccess() {
    const reason = prompt(
      "Reason for suspending gate access (e.g. Unpaid monthly service charge / dues):",
      "Unpaid monthly service dues"
    );
    if (!reason) return;

    setBusy(true);
    setMsg(null);
    try {
      const res = await apiFetch<any>(`/api/residents/${id}/suspend-access`, {
        method: "POST",
        body: { reason },
      });
      setMsg({ type: "success", text: res.message || "Gate access suspended." });
      refetch();
    } catch (e: any) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleRestoreAccess() {
    if (!confirm(`Restore gate access for ${r.firstName} ${r.lastName}?`)) return;

    setBusy(true);
    setMsg(null);
    try {
      const res = await apiFetch<any>(`/api/residents/${id}/restore-access`, {
        method: "POST",
      });
      setMsg({ type: "success", text: res.message || "Gate access restored." });
      refetch();
    } catch (e: any) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteResident() {
    const confirmed = confirm(
      `Are you sure you want to permanently remove ${r.firstName} ${r.lastName}?\n\nThis will delete their active gate passes and remove their login credentials.`
    );
    if (!confirmed) return;

    setBusy(true);
    setMsg(null);
    try {
      await apiFetch(`/api/residents/${id}`, { method: "DELETE" });
      alert(`Resident ${r.firstName} ${r.lastName} removed.`);
      router.push("/residents");
    } catch (e: any) {
      setMsg({ type: "error", text: e.message });
      setBusy(false);
    }
  }

  const isSuspended = r.propertyStatus === "SUSPENDED";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <button onClick={() => router.push("/residents")} className="text-sm text-brand-600 hover:underline">
        ← Back to residents
      </button>

      {/* Suspended Alert Banner */}
      {isSuspended && (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 text-rose-900 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <ShieldBan className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm text-rose-900">
                Gate Access Suspended (Unpaid Dues / Sanctioned)
              </h3>
              <p className="mt-1 text-xs text-rose-700 leading-relaxed">
                This resident cannot generate visitor or self-exit gate codes, and any previously active codes have been cancelled.
                Security officers will see an <strong>ACCESS DENIED</strong> warning at the gate terminal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resident Profile Card */}
      <div className="card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold ${
              isSuspended
                ? "bg-rose-100 text-rose-700"
                : "bg-brand-50 text-brand-700"
            }`}
          >
            {r.firstName?.charAt(0)}
            {r.lastName?.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">
                {r.firstName} {r.lastName}
              </h1>
              {isSuspended ? (
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 border border-rose-300">
                  Suspended (Unpaid Dues)
                </span>
              ) : r.propertyStatus === "ACTIVE" ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                  Active (Paid)
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  Inactive
                </span>
              )}
              {r.verified ? (
                <Badge status="APPROVED" label="Verified" />
              ) : (
                <Badge status="PENDING" label={r.source === "NOTEBOOK_IMPORT" ? "Notebook import" : "Unverified"} />
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {r.phone || "No phone"} · {r.email || "No email"} · {r.property?.unitNumber ? `Unit ${r.property.unitNumber}` : "No unit"}
            </p>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Type: {r.residentType}
            </p>
          </div>
          <button onClick={startEdit} className="btn-secondary text-xs self-start sm:self-center">
            Edit Info
          </button>
        </div>

        {/* Action Management Buttons */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
          {isSuspended ? (
            <button
              onClick={handleRestoreAccess}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <ShieldCheck className="h-4 w-4" /> Restore Gate Access (Dues Paid)
            </button>
          ) : (
            <button
              onClick={handleSuspendAccess}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 active:scale-95 transition-all"
            >
              <ShieldBan className="h-4 w-4 text-rose-600" /> Suspend Access (Unpaid Dues)
            </button>
          )}

          <button
            onClick={handleDeleteResident}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/50 active:scale-95 transition-all ml-auto"
          >
            <Trash2 className="h-4 w-4" /> Remove Resident
          </button>
        </div>

        {msg && (
          <div
            className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${
              msg.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
            }`}
          >
            {msg.text}
          </div>
        )}

        {edit && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 pt-4 border-t border-slate-100">
            <div>
              <label className="label">First name</label>
              <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <label className="label">Last name</label>
              <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="select" value={form.residentType} onChange={(e) => setForm({ ...form, residentType: e.target.value })}>
                {["OWNER", "TENANT", "LANDLORD", "PERMANENT"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Access Status</label>
              <select className="select" value={form.propertyStatus} onChange={(e) => setForm({ ...form, propertyStatus: e.target.value })}>
                <option value="ACTIVE">ACTIVE (Paid)</option>
                <option value="SUSPENDED">SUSPENDED (Unpaid Dues / Blocked)</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
              <input type="checkbox" checked={form.verified} onChange={(e) => setForm({ ...form, verified: e.target.checked })} />
              Verified resident record
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button onClick={save} disabled={busy} className="btn-primary">Save Changes</button>
              <button onClick={() => setEdit(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Property and Vehicles */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-700">
            <Home className="h-4 w-4 text-brand-600" /> Assigned Property
          </h2>
          <p className="text-lg font-semibold text-slate-800">{r.property?.unitNumber || "No unit assigned"}</p>
          <p className="text-sm text-slate-500">{r.property?.block ? `Block ${r.property.block}` : ""} {r.property?.propertyType || ""}</p>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-700">
            <Car className="h-4 w-4 text-brand-600" /> Registered Vehicles ({r.vehicles?.length ?? 0})
          </h2>
          {(!r.vehicles || r.vehicles.length === 0) ? (
            <p className="text-sm text-slate-400">No registered vehicles</p>
          ) : (
            <div className="space-y-2">
              {r.vehicles.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between text-sm">
                  <span className="font-mono font-bold text-slate-800">{v.plateNumber}</span>
                  <span className="text-xs text-slate-500">{v.make} · {v.color}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Gate Activity */}
      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-700">Recent Gate Activity ({r.accessLogs?.length ?? 0})</h2>
        {(!r.accessLogs || r.accessLogs.length === 0) ? (
          <p className="text-sm text-slate-400">No gate logs yet</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {r.accessLogs.map((l: any) => (
              <div key={l.id} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-b-0">
                <div>
                  <p className="font-medium text-slate-700">{l.action} · {l.personType}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(l.createdAt)}</p>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold ${
                    l.action === "ENTRY"
                      ? "bg-emerald-50 text-emerald-700"
                      : l.action === "EXIT"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {l.action}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
