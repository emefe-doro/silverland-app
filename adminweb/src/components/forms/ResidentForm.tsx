"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import { Loader2, UserPlus } from "lucide-react";

const TYPES = ["OWNER", "TENANT", "LANDLORD", "PERMANENT"];

export default function ResidentForm({
  onSuccess,
  submitLabel = "Add Resident",
}: {
  onSuccess?: (res: { resident: any }) => void;
  submitLabel?: string;
}) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", email: "",
    unitNumber: "", residentType: "OWNER", propertyStatus: "ACTIVE",
    notes: "", verified: true, createUser: false, userEmail: "", userPassword: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<any>("/api/residents", {
        method: "POST",
        body: {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || null,
          email: form.email || null,
          unitNumber: form.unitNumber || null,
          residentType: form.residentType,
          propertyStatus: form.propertyStatus,
          notes: form.notes || null,
          verified: form.verified,
          createUser: form.createUser,
          userEmail: form.userEmail || null,
          userPassword: form.userPassword || null,
        },
      });
      onSuccess?.(res);
      setForm({
        firstName: "", lastName: "", phone: "", email: "", unitNumber: "",
        residentType: "OWNER", propertyStatus: "ACTIVE", notes: "", verified: true,
        createUser: false, userEmail: "", userPassword: "",
      });
    } catch (err: any) {
      setError(err.message || "Failed to add resident.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">First name *</label>
          <input className="input" required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="e.g. Adewale" />
        </div>
        <div>
          <label className="label">Last name *</label>
          <input className="input" required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="e.g. Adebayo" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0803…" />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="resident@example.com" />
        </div>
        <div>
          <label className="label">House / unit number</label>
          <input className="input" value={form.unitNumber} onChange={(e) => set("unitNumber", e.target.value)} placeholder="e.g. B1" />
        </div>
        <div>
          <label className="label">Resident type</label>
          <select className="select" value={form.residentType} onChange={(e) => set("residentType", e.target.value)}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="select" value={form.propertyStatus} onChange={(e) => set("propertyStatus", e.target.value)}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <input className="input" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional notes" />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
          <input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} />
          Mark as verified
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
          <input type="checkbox" checked={form.createUser} onChange={(e) => set("createUser", e.target.checked)} />
          Also create a resident portal login
        </label>
        {form.createUser && (
          <>
            <div>
              <label className="label">Login email</label>
              <input className="input" type="email" value={form.userEmail} onChange={(e) => set("userEmail", e.target.value)} placeholder="resident@silverland.ng" />
            </div>
            <div>
              <label className="label">Temp password</label>
              <input className="input" value={form.userPassword} onChange={(e) => set("userPassword", e.target.value)} placeholder="min 6 chars" />
            </div>
          </>
        )}
      </div>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <button className="btn-primary w-full py-3" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-5 w-5" />}
        {submitLabel}
      </button>
    </form>
  );
}
