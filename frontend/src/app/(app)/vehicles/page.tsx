"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import ResidentPicker from "@/components/forms/ResidentPicker";
import { apiFetch } from "@/lib/client";
import { PageLoader, EmptyState } from "@/components/ui/Spinner";
import { Car, Loader2, Plus } from "lucide-react";

export default function VehiclesPage() {
  const { data, loading, error, refetch } = useApi<any>("/api/vehicles");
  const [showForm, setShowForm] = useState(false);
  const [resident, setResident] = useState<any>(null);
  const [form, setForm] = useState({ plateNumber: "", make: "", color: "", type: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const vehicles = data?.vehicles ?? [];

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    send({ ...form });
  }
  async function send(body: any) {
    setBusy(true);
    setMsg(null);
    if (!body.plateNumber) {
      setMsg("Plate number is required.");
      setBusy(false);
      return;
    }
    try {
      await apiFetch("/api/vehicles", { method: "POST", body: { ...body, residentId: resident?.id ?? null } });
      setForm({ plateNumber: "", make: "", color: "", type: "" });
      setResident(null);
      setShowForm(false);
      setMsg("Vehicle added.");
      refetch();
    } catch (err: any) {
      setMsg(err.message || "Failed to add vehicle.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vehicles</h1>
          <p className="text-sm text-slate-500">Registered resident vehicles</p>
        </div>
        <button onClick={() => setShowForm((x) => !x)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>

      {msg && <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">{msg}</div>}

      {showForm && (
        <form onSubmit={submit} className="card space-y-4 p-5">
          <ResidentPicker value={resident} onSelect={setResident} label="Owner (resident)" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Plate number *</label><input className="input" value={form.plateNumber} onChange={(e) => set("plateNumber", e.target.value)} placeholder="ABC-123-XZ" /></div>
            <div><label className="label">Make / model</label><input className="input" value={form.make} onChange={(e) => set("make", e.target.value)} placeholder="Toyota Camry" /></div>
            <div><label className="label">Type</label><select className="select" value={form.type} onChange={(e) => set("type", e.target.value)}>{["", "Sedan", "SUV", "Truck", "Van", "Bike"].map((t) => <option key={t} value={t}>{t || "—"}</option>)}</select></div>
            <div><label className="label">Color</label><input className="input" value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="Silver" /></div>
          </div>
          <button className="btn-primary" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Car className="h-4 w-4" />} Save Vehicle</button>
        </form>
      )}

      {loading && !data && <PageLoader />}
      {data && vehicles.length === 0 && <EmptyState title="No vehicles" description="Click 'Add Vehicle' to register the first one." />}
      {vehicles.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Plate</th><th>Make / Model</th><th>Type</th><th>Color</th><th>Owner</th><th>Unit</th></tr>
              </thead>
              <tbody>
                {vehicles.map((v: any) => (
                  <tr key={v.id}>
                    <td className="font-semibold text-slate-700">{v.plateNumber}</td>
                    <td className="text-slate-600">{v.make || "—"}</td>
                    <td className="text-slate-600">{v.type || "—"}</td>
                    <td className="text-slate-600">{v.color || "—"}</td>
                    <td className="text-slate-600">{v.resident ? `${v.resident.firstName} ${v.resident.lastName}` : "—"}</td>
                    <td className="text-slate-600">{v.resident?.property?.unitNumber || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
