"use client";

import { useState } from "react";
import ResidentPicker from "./ResidentPicker";
import { apiFetch } from "@/lib/client";
import { Loader2, Bike } from "lucide-react";

type Resident = { id: string; firstName: string; lastName: string; phone: string | null; property: { unitNumber: string } | null };

export default function DispatchForm({
  fixedResident,
  onSuccess,
  submitLabel = "Register Dispatch Rider",
}: {
  fixedResident?: Resident | null;
  onSuccess?: (res: { rider: any }) => void;
  submitLabel?: string;
}) {
  const [resident, setResident] = useState<Resident | null>(fixedResident ?? null);
  const [form, setForm] = useState({
    riderName: "", riderPhone: "", company: "", orderReference: "",
    deliveryUnit: "", bikeNumber: "", plateNumber: "", notes: "",
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
      setError("Please select the receiving resident.");
      setBusy(false);
      return;
    }
    try {
      const res = await apiFetch<any>("/api/dispatch", {
        method: "POST",
        body: {
          residentId: fixedResident?.id ?? resident?.id,
          riderName: form.riderName,
          riderPhone: form.riderPhone || null,
          company: form.company || null,
          orderReference: form.orderReference || null,
          deliveryUnit: form.deliveryUnit || null,
          bikeNumber: form.bikeNumber || null,
          plateNumber: form.plateNumber || null,
          notes: form.notes || null,
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
        {!fixedResident && <div className="sm:col-span-2"><ResidentPicker value={resident} onSelect={setResident} label="Receiving resident" /></div>}
        <div>
          <label className="label">Rider name *</label>
          <input className="input" required value={form.riderName} onChange={(e) => set("riderName", e.target.value)} placeholder="e.g. John Doe" />
        </div>
        <div>
          <label className="label">Rider phone</label>
          <input className="input" value={form.riderPhone} onChange={(e) => set("riderPhone", e.target.value)} placeholder="0803…" />
        </div>
        <div>
          <label className="label">Company / platform</label>
          <input className="input" value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="XYZ Logistics, FoodDash…" />
        </div>
        <div>
          <label className="label">Order / reference</label>
          <input className="input" value={form.orderReference} onChange={(e) => set("orderReference", e.target.value)} placeholder="XYZ-12345" />
        </div>
        <div>
          <label className="label">Delivery unit/address</label>
          <input className="input" value={form.deliveryUnit} onChange={(e) => set("deliveryUnit", e.target.value)} placeholder="C5 or 15 Adewale St…" />
        </div>
        <div>
          <label className="label">Bike / plate number</label>
          <input className="input" value={form.bikeNumber} onChange={(e) => set("bikeNumber", e.target.value)} placeholder="ABC-123-XZ" />
        </div>
        <div>
          <label className="label">Purpose</label>
          <input className="input" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Food delivery…" />
        </div>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <button className="btn-primary w-full py-3" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bike className="h-5 w-5" />}
        {submitLabel}
      </button>
    </form>
  );
}
