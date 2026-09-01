"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import Badge from "@/components/ui/Badge";
import { PageLoader, EmptyState } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/client";
import { Loader2, UserPlus } from "lucide-react";

const ROLES = ["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER", "RESIDENT"];

export default function AdminUsersPage() {
  const { data, loading, error, refetch } = useApi<any>("/api/users");
  const [form, setForm] = useState({ name: "", email: "", role: "SECURITY_OFFICER", password: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const users = data?.users ?? [];

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await apiFetch("/api/users", { method: "POST", body: form });
      setForm({ name: "", email: "", role: "SECURITY_OFFICER", password: "" });
      refetch();
      setMsg("User created.");
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(u: any) {
    setMsg(null);
    try {
      await apiFetch(`/api/users/${u.id}`, { method: "PUT", body: { isActive: !u.isActive } });
      refetch();
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Users & Permissions</h1>
        <p className="text-sm text-slate-500">Manage accounts and roles</p>
      </div>

      {msg && <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">{msg}</div>}

      <form onSubmit={add} className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2"><label className="label">Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="lg:col-span-2"><label className="label">Email</label><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><label className="label">Role</label><select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
        <div><label className="label">Password</label><input className="input" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min 6 chars" /></div>
        <div className="flex items-end lg:col-span-6"><button className="btn-primary w-full" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Create user</button></div>
      </form>

      {loading && !data && <PageLoader />}
      {data && users.length === 0 && <EmptyState title="No users" description="Create the first account." />}
      {users.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id}>
                    <td className="font-medium text-slate-700">{u.name}</td>
                    <td className="text-slate-600">{u.email}</td>
                    <td className="text-slate-600">{u.role}</td>
                    <td>{u.isActive ? <Badge status="APPROVED" label="Active" /> : <Badge status="INACTIVE" label="Inactive" />}</td>
                    <td>
                      {u.role === "SECURITY_OFFICER" && u.securityOfficer && <span className="text-xs text-slate-400">{u.securityOfficer.badgeNumber}</span>}
                      {u.role !== "SUPER_ADMIN" && <button onClick={() => toggleActive(u)} className="text-xs font-medium text-brand-600 hover:underline ml-2">{u.isActive ? "Deactivate" : "Activate"}</button>}
                    </td>
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
