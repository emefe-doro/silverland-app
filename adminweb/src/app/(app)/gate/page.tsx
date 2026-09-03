"use client";

import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { QrCode, UserPlus, Bike, LogOut, Search, Users, Bike as BikeIcon, Car } from "lucide-react";

type Dash = {
  stats: { visitorsInside: number; dispatchInside: number; vehiclesInside: number };
};

const BTN = [
  { href: "/gate/scan", label: "SCAN QR", icon: QrCode, color: "bg-brand-600 hover:bg-brand-700", big: true },
  { href: "/gate/register-visitor", label: "REGISTER VISITOR", icon: UserPlus, color: "bg-emerald-600 hover:bg-emerald-700", big: true },
  { href: "/gate/dispatch", label: "DISPATCH RIDER", icon: Bike, color: "bg-amber-500 hover:bg-amber-600", big: true },
  { href: "/gate/checkout", label: "CHECK OUT", icon: LogOut, color: "bg-rose-500 hover:bg-rose-600", big: true },
  { href: "/gate/search", label: "SEARCH", icon: Search, color: "bg-sky-500 hover:bg-sky-600", big: true },
];

export default function GatePage() {
  const { data } = useApi<Dash>("/api/dashboard");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-center text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-200">
          Welcome to
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-wide">SILVERLAND ZONE</h1>
        <p className="text-brand-200">Tedo Housing Estate · Gate Control</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        {BTN.map((b) => (
          <Link
            key={b.href}
            href={b.href}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl py-7 text-white shadow transition ${b.color}`}
          >
            <b.icon className="h-9 w-9" />
            <span className="text-center text-sm font-bold leading-tight">{b.label}</span>
          </Link>
        ))}
        <Link
          href="/gate/search"
          className="flex flex-col items-center justify-center gap-2 rounded-2xl py-7 bg-slate-700 hover:bg-slate-800 text-white shadow transition"
        >
          <Car className="h-9 w-9" />
          <span className="text-center text-sm font-bold leading-tight">VEHICLES</span>
        </Link>
      </div>

      <div className="card mt-6 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Currently Inside</h2>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-brand-600">{data?.stats.visitorsInside ?? "—"}</p>
            <p className="mt-1 text-xs text-slate-500">Visitors</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-amber-500">{data?.stats.dispatchInside ?? "—"}</p>
            <p className="mt-1 text-xs text-slate-500">Dispatch Riders</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-sky-600">{data?.stats.vehiclesInside ?? "—"}</p>
            <p className="mt-1 text-xs text-slate-500">Vehicles</p>
          </div>
        </div>
      </div>
    </div>
  );
}
