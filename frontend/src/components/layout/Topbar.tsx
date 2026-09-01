"use client";

import { Menu, LogOut, Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SessionUser, clearToken, getToken } from "@/lib/auth";
import { apiUrl } from "@/lib/client";

export default function Topbar({
  user,
  onMenu,
}: {
  user: SessionUser;
  onMenu: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      const token = getToken();
      await fetch(apiUrl("/api/auth/logout"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      /* ignore */
    }
    clearToken();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800">
          SILVERLAND ZONE
        </p>
        <p className="hidden text-[11px] text-slate-500 sm:block">
          Tedo Housing Estate — Access Control
        </p>
      </div>

      <Link
        href="/notifications"
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
      </Link>

      <div className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden text-sm font-medium text-slate-700 sm:block">
          {user.name}
        </span>
      </div>

      <button
        onClick={logout}
        disabled={pending}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
        aria-label="Log out"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </header>
  );
}
