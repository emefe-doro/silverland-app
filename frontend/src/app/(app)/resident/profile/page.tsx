"use client";

import { useApi } from "@/hooks/useApi";
import { PageLoader } from "@/components/ui/Spinner";
import { ShieldCheck, Home, Car } from "lucide-react";

export default function ResidentProfilePage() {
  const { data, loading, error } = useApi<any>("/api/resident/profile");
  if (loading) return <PageLoader />;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return null;
  const r = data.resident;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white">
            {r.firstName?.charAt(0)}{r.lastName?.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{r.firstName} {r.lastName}</h1>
            <p className="text-sm text-slate-500">{r.residentType}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-500"><ShieldCheck className="h-4 w-4 text-brand-600" /> Contact</h2>
          <dl className="space-y-1 text-sm text-slate-700">
            <div><span className="text-slate-400">Email: </span>{r.user?.email || r.email || "—"}</div>
            <div><span className="text-slate-400">Phone: </span>{r.phone || "—"}</div>
          </dl>
        </div>
        <div className="card p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-500"><Home className="h-4 w-4 text-brand-600" /> Property</h2>
          <p className="text-lg font-semibold text-slate-700">{r.property?.unitNumber || "No unit"}</p>
          <p className="text-sm text-slate-500">{r.property?.block || ""} {r.property?.propertyType || ""}</p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-500"><Car className="h-4 w-4 text-brand-600" /> Vehicles</h2>
        {(r.vehicles ?? []).length === 0 && <p className="text-sm text-slate-400">No vehicles recorded.</p>}
        <ul className="space-y-2">
          {(r.vehicles ?? []).map((v: any) => (
            <li key={v.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="font-semibold text-slate-700">{v.plateNumber}</span>
              <span className="ml-2 text-slate-400">{v.make || ""} {v.color || ""} {v.type || ""}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
