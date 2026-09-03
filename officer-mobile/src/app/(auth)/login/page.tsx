"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { setToken } from "@/lib/auth";
import { ShieldCheck, Lock, Mail, Eye, EyeOff, BadgeCheck, Sparkles } from "lucide-react";

export default function OfficerLoginPage() {
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

      if (res.user.role !== "SECURITY_OFFICER" && res.user.role !== "SUPER_ADMIN") {
        throw new Error("This terminal is strictly for security gate officers.");
      }

      setToken(res.token);
      router.replace("/terminal");
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setEmail("officer.ade@silverland.ng");
    setPassword("Officer@123");
  }

  return (
    <div className="flex flex-1 flex-col justify-between p-6 bg-slate-900 text-white min-h-screen">
      <div className="pt-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/40 ring-4 ring-blue-500/20">
          <ShieldCheck className="h-9 w-9" />
        </div>
        <div className="mt-5 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-950 border border-blue-800 px-3 py-1 text-xs font-bold text-blue-400">
            <BadgeCheck className="h-3.5 w-3.5" /> Gate Security Post
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-white">
            SILVERLAND ZONE
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Main Gate Verification Terminal
          </p>
        </div>

        <div className="mt-8 rounded-3xl bg-slate-800/90 border border-slate-700/80 p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-rose-950/80 border border-rose-800 p-3 text-xs text-rose-300 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Officer Email / Badge ID
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="officer.ade@silverland.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3.5 py-3 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Terminal Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3.5 py-3 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
            >
              {loading ? "Verifying..." : "Sign in to Gate Terminal"}
            </button>
          </form>

          <div className="mt-5 border-t border-slate-700 pt-4">
            <button
              type="button"
              onClick={fillDemo}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-700/60 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-400" /> Fill Demo Officer (Ade)
            </button>
          </div>
        </div>
      </div>

      <div className="py-4 text-center text-xs text-slate-500 font-medium">
        Tedo Housing Estate Access Control • Gate Device
      </div>
    </div>
  );
}
