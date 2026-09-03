"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  UserPlus,
  Bike,
  Truck,
  Home,
  Car,
  ClipboardList,
  FileBarChart,
  BadgeCheck,
  UserCog,
  Bell,
  Settings,
  History,
  User,
  X,
  LogOut,
  KeyRound,
} from "lucide-react";
import { navForRole, type NavItem } from "./nav";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import type { SessionUser } from "@/lib/auth";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  KeyRound,
  ShieldCheck,
  Users,
  UserPlus,
  Bike,
  Truck,
  Home,
  Car,
  ClipboardList,
  FileBarChart,
  BadgeCheck,
  UserCog,
  Bell,
  Settings,
  History,
  User,
};

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = ICONS[item.icon] ?? LayoutDashboard;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-brand-600 text-white"
          : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge === "notifications" && (
        <span className="h-2 w-2 rounded-full bg-red-500" />
      )}
    </Link>
  );
}

export function SidebarContent({
  user,
  onNavigate,
}: {
  user: SessionUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = useMemo(() => navForRole(user.role), [user.role]);

  return (
    <div className="flex h-full flex-col">
      <Link href={user.role === "RESIDENT" ? "/resident/dashboard" : "/dashboard"} className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-white">SILVERLAND ZONE</p>
          <p className="text-[11px] text-brand-200">Tedo Housing Estate</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/visitors" && item.href !== "/dispatch")}
            onClick={onNavigate}
          />
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-1 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-white text-sm font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-[11px] text-brand-200">{user.role.replace("_", " ")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({
  open,
  user,
  onClose,
}: {
  open: boolean;
  user: SessionUser;
  onClose: () => void;
}) {
  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-brand-700 lg:block">
        <SidebarContent user={user} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-brand-700 shadow-xl">
            <button
              onClick={onClose}
              className="absolute right-3 top-4 rounded-full p-1 text-white hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent user={user} onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
