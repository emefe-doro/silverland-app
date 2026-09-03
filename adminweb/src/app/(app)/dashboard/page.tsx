"use client";

import { useApi } from "@/hooks/useApi";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/Spinner";
import Link from "next/link";
import { Users, DoorOpen, Bike, Car, Clock, ArrowLeftRight, ShieldAlert } from "lucide-react";
import { formatDateTime, formatTime, relativeTime, initials } from "@/lib/utils";

type Dash = {
  stats: {
    totalResidents: number;
    visitorsInside: number;
    dispatchInside: number;
    vehiclesInside: number;
    expectedToday: number;
    exitedToday: number;
    deniedToday: number;
  };
  recentAccess: any[];
  visitorsInsideList: any[];
  recentAlerts: any[];
};

export default function DashboardPage() {
  const { data, loading, error, refetch } = useApi<Dash>("/api/dashboard");

  if (loading) return <PageLoader />;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return null;

  const s = data.stats;
  const recent = data.recentAccess ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Live estate access overview</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary text-xs">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total Residents" value={s.totalResidents} icon={<Users className="h-5 w-5" />} accent="brand" />
        <StatCard label="Visitors Inside" value={s.visitorsInside} icon={<DoorOpen className="h-5 w-5" />} accent="green" />
        <StatCard label="Dispatch Inside" value={s.dispatchInside} icon={<Bike className="h-5 w-5" />} accent="amber" />
        <StatCard label="Vehicles Inside" value={s.vehiclesInside} icon={<Car className="h-5 w-5" />} accent="brand" />
        <StatCard label="Expected Today" value={s.expectedToday} icon={<Clock className="h-5 w-5" />} accent="green" />
        <StatCard label="Exited Today" value={s.exitedToday} icon={<ArrowLeftRight className="h-5 w-5" />} accent="blue" />
        <StatCard label="Denied Today" value={s.deniedToday} icon={<ShieldAlert className="h-5 w-5" />} accent="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold text-slate-700">Recent Gate Activity</h2>
            <Link href="/access-logs" className="text-sm font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recent.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-400">No activity yet.</p>
            )}
            {recent.map((log: any) => (
              <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                  {log.visitor ? initials(log.visitor.fullName?.split(" ")[0] || "V") : log.dispatch ? initials(log.dispatch.riderName || "D") : "◆"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">
                    {log.visitor?.fullName || log.dispatch?.riderName || log.personType}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {log.resident ? `${log.resident.firstName} ${log.resident.lastName}` : ""}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(log.entryAt)} · {relativeTime(log.entryAt)} ·
                    {log.vehiclePlate ? ` ${log.vehiclePlate}` : ""}
                  </p>
                </div>
                <Badge status={log.action} />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <h2 className="font-semibold text-slate-700">Security Alerts</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {(data.recentAlerts ?? []).length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-400">No alerts.</p>
            )}
            {(data.recentAlerts ?? []).map((a: any) => (
              <div key={a.id} className="px-4 py-3">
                <p className="text-sm font-medium text-slate-700">{a.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{a.message}</p>
                <p className="mt-1 text-[11px] text-slate-400">{relativeTime(a.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
