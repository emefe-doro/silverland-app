"use client";

import { useApi } from "@/hooks/useApi";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/Spinner";
import Link from "next/link";
import { Users, Bike, DoorOpen, Clock, UserPlus } from "lucide-react";
import { formatDateTime, relativeTime } from "@/lib/utils";

export default function ResidentDashboard() {
  const { data, loading, error } = useApi<any>("/api/dashboard");

  if (loading) return <PageLoader />;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return null;

  const s = data.stats;
  const recent = data.recentAccess ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Home</h1>
        <p className="text-sm text-slate-500">Your visitors & access</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Expected today" value={s.expectedToday} icon={<Clock className="h-5 w-5" />} accent="green" />
        <StatCard label="Visitors inside" value={s.visitorsInside} icon={<DoorOpen className="h-5 w-5" />} />
        <StatCard label="Dispatch inside" value={s.dispatchInside} icon={<Bike className="h-5 w-5" />} accent="amber" />
        <StatCard label="Denied today" value={s.deniedToday} icon={<Users className="h-5 w-5" />} accent="red" />
      </div>

      <div className="flex gap-3">
        <Link href="/resident/register-visitor" className="btn-primary flex-1"><UserPlus className="h-4 w-4" /> Pre-register Visitor</Link>
        <Link href="/resident/dispatch" className="btn-secondary flex-1"><Bike className="h-4 w-4" /> Dispatch Riders</Link>
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-700">Recent Activity</h2>
          <Link href="/resident/history" className="text-sm font-medium text-brand-600 hover:underline">View all</Link>
        </div>
        {recent.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">No activity yet.</p>}
        <div className="divide-y divide-slate-100">
          {recent.map((l: any) => (
            <div key={l.id} className="flex items-center gap-3 px-4 py-3">
              <Badge status={l.action} />
              <div className="flex-1 text-sm">
                <span className="font-medium text-slate-700">{l.visitor?.fullName || l.dispatch?.riderName || l.personType}</span>
                <span className="ml-2 text-xs text-slate-400">{formatDateTime(l.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
