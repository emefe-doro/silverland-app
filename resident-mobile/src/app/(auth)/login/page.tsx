"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { setToken } from "@/lib/auth";
import { ShieldCheck, Lock, Mail, Eye, EyeOff, KeyRound, Sparkles } from "lucide-react";

export default function ResidentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch<{ token: string; user: any }>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });

      if (res.user.role !== "RESIDENT" && res.user.role !== "SUPER_ADMIN") {
        throw new Error("This app is specifically for estate residents. Please use the appropriate portal.");
      }

      setToken(res.token);
      router.replace("/home");
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setEmail("resident@silverland.ng");
    setPassword("Resident@123");
  }

  return (
    <div className="flex flex-1 flex-col justify-between p-6 bg-gradient-to-b from-brand-50/50 via-white to-slate-50">
      <div className="pt-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
          <KeyRound className="h-8 w-8" />
        </div>
        <div className="mt-5 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
            <ShieldCheck className="h-3.5 w-3.5" /> Resident Gate Pass
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
            SILVERLAND ZONE
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Tedo Housing Estate • Access Portal
          </p>
        </div>

        <div className="mt-8 card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="label">Resident Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="resident@silverland.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? "Signing in..." : "Access My Passes"}
            </button>
          </form>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={fillDemo}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-brand-600" /> Fill Demo Resident Login
            </button>
          </div>
        </div>
      </div>

      <div className="py-4 text-center text-xs text-slate-400">
        Silverland Security Access Control • Mobile Edition
      </div>
    </div>
  );
}
