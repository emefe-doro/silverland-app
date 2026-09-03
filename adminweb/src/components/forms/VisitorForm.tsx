"use client";

import { useState } from "react";
import ResidentPicker from "./ResidentPicker";
import { apiFetch } from "@/lib/client";
import { Loader2, QrCode } from "lucide-react";

type Resident = { id: string; firstName: string; lastName: string; phone: string | null; property: { unitNumber: string } | null };

const TYPES = ["GUEST", "FAMILY", "DELIVERY", "SERVICE", "CONTRACTOR", "OTHER"];

export default function VisitorForm({
  fixedResident,
  onSuccess,
  submitLabel = "Register Visitor",
}: {
  fixedResident?: Resident | null;
  onSuccess?: (res: { visitor: any; pass: any }) => void;
  submitLabel?: string;
}) {
  const [resident, setResident] = useState<Resident | null>(fixedResident ?? null);
  const [form, setForm] = useState({
    fullName: "", phone: "", visitorType: "GUEST", purpose: "",
    vehicleType: "", vehiclePlate: "", expectedDate: "", expectedArrival: "", expectedDeparture: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (!resident && !fixedResident) {
      setError("Please select the resident being visited.");
      setBusy(false);
      return;
    }
    try {
      const res = await apiFetch<any>("/api/visitors", {
        method: "POST",
        body: {
          residentId: fixedResident?.id ?? resident?.id,
          fullName: form.fullName,
          phone: form.phone || null,
          visitorType: form.visitorType,
          purpose: form.purpose || null,
          vehicleType: form.vehicleType || null,
          vehiclePlate: form.vehiclePlate || null,
          expectedDate: form.expectedDate || null,
          expectedArrival: form.expectedArrival || null,
          expectedDeparture: form.expectedDeparture || null,
        },
      });
      onSuccess?.(res);
    } catch (err: any) {
      setError(err.message || "Register failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {!fixedResident && <div className="sm:col-span-2"><ResidentPicker value={resident} onSelect={setResident} /></div>}
        <div>
          <label className="label">Full name *</label>
          <input className="input" value={form.fullName} required onChange={(e) => set("fullName", e.target.value)} placeholder="Visitor full name" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0803…" />
        </div>
        <div>
          <label className="label">Visitor type</label>
          <select className="select" value={form.visitorType} onChange={(e) => set("visitorType", e.target.value)}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Purpose of visit</label>
          <input className="input" value={form.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder="Family visit, delivery…" />
        </div>
        <div>
          <label className="label">Vehicle type</label>
          <input className="input" value={form.vehicleType} onChange={(e) => set("vehicleType", e.target.value)} placeholder="Car, SUV, Truck…" />
        </div>
        <div>
          <label className="label">Vehicle plate</label>
          <input className="input" value={form.vehiclePlate} onChange={(e) => set("vehiclePlate", e.target.value)} placeholder="ABC-123-XZ" />
        </div>
        <div>
          <label className="label">Expected date</label>
          <input className="input" type="date" value={form.expectedDate} onChange={(e) => set("expectedDate", e.target.value)} />
        </div>
        <div>
          <label className="label">Expected arrival</label>
          <input className="input" type="time" value={form.expectedArrival} onChange={(e) => set("expectedArrival", e.target.value)} />
        </div>
        <div>
          <label className="label">Expected departure</label>
          <input className="input" type="time" value={form.expectedDeparture} onChange={(e) => set("expectedDeparture", e.target.value)} />
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <button className="btn-primary w-full py-3" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-5 w-5" />}
        {submitLabel}
      </button>
    </form>
  );
}
