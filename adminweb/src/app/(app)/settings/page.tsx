"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/client";
import { PageLoader } from "@/components/ui/Spinner";
import { Loader2, Save } from "lucide-react";

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
      <span className="text-sm text-slate-600">{label}</span>
      <button type="button" onClick={() => onChange(!value)} className={`relative h-6 w-11 rounded-full transition ${value ? "bg-brand-600" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${value ? "left-6" : "left-0.5"}`} />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const { data, loading, error } = useApi<any>("/api/settings");
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data?.settings && !form) setForm(data.settings);
  }, [data, form]);

  if (loading && !data) return <PageLoader />;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!form) return null;

  const number = (k: string, v: string) => setForm({ ...form, [k]: Number(v) });
  const text = (k: string, v: string) => setForm({ ...form, [k]: v });
  const bool = (k: string, v: boolean) => setForm({ ...form, [k]: v });

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await apiFetch("/api/settings", { method: "PUT", body: form });
      setMsg("Settings saved.");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Estate Settings</h1>
        <p className="text-sm text-slate-500">Configure access rules and estate branding</p>
      </div>

      <form className="card space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Estate name</label><input className="input" value={form.estateName} onChange={(e) => text("estateName", e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="label">Subtitle</label><input className="input" value={form.estateSubtitle} onChange={(e) => text("estateSubtitle", e.target.value)} /></div>
          <div><label className="label">Visitor pass validity (hours)</label><input className="input" type="number" value={form.visitorPassValidityHours} onChange={(e) => number("visitorPassValidityHours", e.target.value)} /></div>
          <div><label className="label">Dispatch validity (minutes)</label><input className="input" type="number" value={form.dispatchValidityMinutes} onChange={(e) => number("dispatchValidityMinutes", e.target.value)} /></div>
          <div><label className="label">Max visitor duration (hours)</label><input className="input" type="number" value={form.maxVisitorDurationHours} onChange={(e) => number("maxVisitorDurationHours", e.target.value)} /></div>
        </div>

        <div className="space-y-2">
          <Toggle label="Residents must approve their visitors" value={form.residentsMustApproveVisitors} onChange={(v) => bool("residentsMustApproveVisitors", v)} />
          <Toggle label="Dispatch riders require resident confirmation" value={form.dispatchRequiresResidentConfirmation} onChange={(v) => bool("dispatchRequiresResidentConfirmation", v)} />
          <Toggle label="Security officers can edit resident records" value={form.securityOfficerCanEditResidents} onChange={(v) => bool("securityOfficerCanEditResidents", v)} />
          <Toggle label="Allow unexpected visitors at the gate" value={form.allowUnexpectedVisitors} onChange={(v) => bool("allowUnexpectedVisitors", v)} />
        </div>

        {msg && <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">{msg}</div>}

        <button className="btn-primary" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save settings
        </button>
      </form>
    </div>
  );
}
