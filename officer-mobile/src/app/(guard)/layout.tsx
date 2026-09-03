"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { getToken, clearToken, type SessionUser } from "@/lib/auth";
import { ShieldCheck, LogOut, Radio } from "lucide-react";

export default function GuardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    let mounted = true;
    apiFetch<{ user: SessionUser }>("/api/auth/session")
      .then((res) => {
        if (!mounted) return;
        if (res.user.role !== "SECURITY_OFFICER" && res.user.role !== "SUPER_ADMIN") {
          clearToken();
          router.replace("/login");
          return;
        }
        setUser(res.user);
      })
      .catch(() => {
        if (!mounted) return;
        clearToken();
        router.replace("/login");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  function handleLogout() {
    clearToken();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[80vh] bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-xs font-bold tracking-wider text-slate-400">Loading Gate Terminal...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-slate-900 text-slate-100">
      {/* Officer Terminal Top Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white tracking-tight">GATE POST</span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-950 border border-emerald-800/80 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 truncate max-w-[170px]">
              {user.name} • Main Gate
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-slate-300 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
            {clock}
          </span>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors active:scale-95"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Terminal Area */}
      <main className="flex-1 px-4 py-4 pb-8">{children}</main>
    </div>
  );
}
