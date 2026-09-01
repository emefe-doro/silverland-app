"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { setToken, SessionUser } from "@/lib/auth";
import { APP_NAME, APP_SUBTITLE } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ token: string; redirectTo: string }>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setToken(res.token);
      router.replace(res.redirectTo);
    } catch (err: any) {
      setError(err.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900">
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
              <ShieldCheck className="h-9 w-9 text-brand-600" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-white">{APP_NAME}</h1>
            <p className="text-sm text-brand-200">{APP_SUBTITLE}</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-brand-300">Access Control System</p>
          </div>

          <form onSubmit={submit} className="card space-y-4 p-6 shadow-xl">
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@silverland.ng" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>

            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <button className="btn-primary w-full py-3" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </button>

            <p className="text-center text-xs text-slate-400">Authorized personnel only. All access is recorded and audited.</p>
          </form>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-center text-xs text-brand-100">
            <p className="font-semibold">Demo accounts</p>
            <p className="mt-1">Admin: superadmin@silverland.ng / SuperAdmin@123</p>
            <p>Officer: officer.ade@silverland.ng / Officer@123</p>
            <p>Resident: resident@silverland.ng / Resident@123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
