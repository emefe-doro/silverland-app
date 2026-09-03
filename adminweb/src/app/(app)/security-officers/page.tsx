"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import Badge from "@/components/ui/Badge";
import { PageLoader, EmptyState } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/client";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function SecurityOfficersPage() {
  const { data, loading, error, refetch } = useApi<any>("/api/security-officers");
  const [form, setForm] = useState({ name: "", badgeNumber: "", station: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await apiFetch("/api/security-officers", { method: "POST", body: form });
      setForm({ name: "", badgeNumber: "", station: "", email: "" });
      refetch();
      setMsg("Officer added.");
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  const officers = data?.officers ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Security Officers</h1>
        <p className="text-sm text-slate-500">Gate personnel and their assignments</p>
      </div>

      {msg && <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">{msg}</div>}

      <form onSubmit={add} className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div><label className="label">Officer name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Badge #</label><input className="input" required value={form.badgeNumber} onChange={(e) => setForm({ ...form, badgeNumber: e.target.value })} placeholder="SLV-004" /></div>
        <div><label className="label">Station</label><input className="input" value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} /></div>
        <div><label className="label">Login email (optional)</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="flex items-end"><button className="btn-primary w-full" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Add</button></div>
      </form>

      {loading && !data && <PageLoader />}
      {data && officers.length === 0 && <EmptyState title="No officers" description="Add your gate personnel." />}
      {officers.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Officer</th><th>Badge</th><th>Station</th><th>Login</th><th>Status</th></tr></thead>
              <tbody>
                {officers.map((o: any) => (
                  <tr key={o.id}>
                    <td className="font-medium text-slate-700">{o.name}</td>
                    <td className="text-slate-600">{o.badgeNumber}</td>
                    <td className="text-slate-600">{o.station || "—"}</td>
                    <td className="text-slate-600">{o.user?.email || "—"}</td>
                    <td>{o.user?.isActive === false ? <Badge status="INACTIVE" label="Inactive" /> : <Badge status="APPROVED" label="Active" />}</td>
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
