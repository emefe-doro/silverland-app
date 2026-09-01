"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import Badge from "@/components/ui/Badge";
import Link from "next/link";
import { Search } from "lucide-react";

type SearchRes = { visitors: any[]; residents: any[]; riders: any[]; vehicles: any[] };

export default function GateSearchPage() {
  const [q, setQ] = useState("");
  const { data, loading, error } = useApi<SearchRes>(q.trim() ? `/api/search?q=${encodeURIComponent(q)}` : null);

  const visitors = data?.visitors ?? [];
  const residents = data?.residents ?? [];
  const riders = data?.riders ?? [];
  const vehicles = data?.vehicles ?? [];
  const empty = !loading && visitors.length + residents.length + riders.length + vehicles.length === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Search</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-10"
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Visitor, resident, rider, plate or unit number…"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {empty && <p className="py-10 text-center text-sm text-slate-400">No matches for &quot;{q}&quot;.</p>}

      {visitors.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Visitors</h2>
          <ul className="card divide-y divide-slate-100">
            {visitors.map((v: any) => (
              <li key={v.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-700">{v.fullName}</p>
                  <p className="text-xs text-slate-400">{v.phone} · {v.resident?.property?.unitNumber}</p>
                </div>
                <Badge status={v.status} />
                <Link href={`/visitors/${v.id}`} className="text-sm font-medium text-brand-600 hover:underline">View</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {residents.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Residents</h2>
          <ul className="card divide-y divide-slate-100">
            {residents.map((r: any) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-700">{r.firstName} {r.lastName}</p>
                  <p className="text-xs text-slate-400">{r.property?.unitNumber} · {r.phone}</p>
                </div>
                <span className="text-xs text-slate-400">{r.residentType}</span>
                <Link href={`/residents/${r.id}`} className="text-sm font-medium text-brand-600 hover:underline">View</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {riders.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Dispatch Riders</h2>
          <ul className="card divide-y divide-slate-100">
            {riders.map((r: any) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-700">{r.riderName} <span className="text-xs text-slate-400">({r.company})</span></p>
                  <p className="text-xs text-slate-400">{r.bikeNumber} · {r.orderReference}</p>
                </div>
                <Badge status={r.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {vehicles.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Vehicles</h2>
          <ul className="card divide-y divide-slate-100">
            {vehicles.map((v: any) => (
              <li key={v.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-700">{v.plateNumber}</p>
                  <p className="text-xs text-slate-400">{v.make} {v.color} · {v.resident?.firstName} {v.resident?.lastName}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
