"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { getToken, clearToken, type SessionUser } from "@/lib/auth";
import { ShieldCheck, LogOut, Home, KeyRound } from "lucide-react";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [residentProfile, setResidentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    let mounted = true;
    Promise.all([
      apiFetch<{ user: SessionUser }>("/api/auth/session"),
      apiFetch<{ resident: any }>("/api/resident/profile").catch(() => ({ resident: null })),
    ])
      .then(([sessionRes, profileRes]) => {
        if (!mounted) return;
        if (sessionRes.user.role !== "RESIDENT" && sessionRes.user.role !== "SUPER_ADMIN") {
          clearToken();
          router.replace("/login");
          return;
        }
        setUser(sessionRes.user);
        setResidentProfile(profileRes.resident);
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
      <div className="flex flex-1 items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="text-xs font-semibold text-slate-500">Loading Resident Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const unit = residentProfile?.property?.unitNumber ?? "Unit";
  const residentName = residentProfile
    ? `${residentProfile.firstName} ${residentProfile.lastName}`
    : user.name;

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-slate-50">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 tracking-tight">SILVERLAND</span>
              <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                Unit {unit}
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 truncate max-w-[170px]">
              {residentName}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors active:scale-95"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-5 pb-8">{children}</main>
    </div>
  );
}
