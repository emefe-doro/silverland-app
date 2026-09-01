"use client";

import { useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Home } from "lucide-react";

type Resident = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  property: { unitNumber: string } | null;
};

export default function ResidentPicker({
  onSelect,
  value,
  label = "Resident being visited",
}: {
  onSelect: (r: Resident | null) => void;
  value: Resident | null;
  label?: string;
}) {
  const [q, setQ] = useState("");
  const { data, loading } = useApi<any>(q.trim() ? `/api/residents?q=${encodeURIComponent(q)}&limit=8` : null);

  const results = useMemo(() => (data?.residents as Resident[]) ?? [], [data]);

  if (value) {
    return (
      <div>
        <label className="label">{label}</label>
        <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
          <Home className="h-4 w-4 text-brand-600" />
          <span className="flex-1 text-sm font-medium text-slate-700">
            {value.firstName} {value.lastName}
            {value.property ? ` · ${value.property.unitNumber}` : ""}
          </span>
          <button type="button" onClick={() => onSelect(null)} className="text-xs font-medium text-brand-600 hover:underline">
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        placeholder="Search resident by name or unit… (e.g. Adewale, B1)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {loading && <p className="mt-1 text-xs text-slate-400">Searching…</p>}
      {!loading && results.length > 0 && (
        <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelect(r)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                  {r.firstName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-700">{r.firstName} {r.lastName}</p>
                  <p className="text-xs text-slate-400">{r.property?.unitNumber || "—"}</p>
                </div>
                <Home className="h-4 w-4 text-slate-300" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!loading && q.trim() && results.length === 0 && (
        <p className="mt-1 text-xs text-slate-400">No matching resident. They may be unverified imports.</p>
      )}
    </div>
  );
}
