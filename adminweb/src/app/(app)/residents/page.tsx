"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import Badge from "@/components/ui/Badge";
import { PageLoader, EmptyState } from "@/components/ui/Spinner";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import ResidentForm from "@/components/forms/ResidentForm";
import { Home, FileUp, UserPlus, Loader2, ShieldBan, ShieldCheck } from "lucide-react";

export default function ResidentsPage() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [raw, setRaw] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [addedMsg, setAddedMsg] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  queryParams.set("limit", "200");
  if (q) queryParams.set("q", q);
  if (statusFilter) queryParams.set("status", statusFilter);

  const { data, loading, error, refetch } = useApi<any>(
    `/api/residents?${queryParams.toString()}`
  );

  async function doImport() {
    setImporting(true);
    setImportMsg(null);
    const items = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,;|]/).map((p) => p.trim());
        const name = (parts[0] || "").split(" ");
        return {
          firstName: name[0] || "",
          lastName: name[1] || "",
          phone: parts[1] || "",
          unitNumber: parts[2] || "",
        };
      })
      .filter((i) => i.firstName);
    try {
      const r = await apiFetch<any>("/api/import/notebook", { method: "POST", body: { items } });
      setImportMsg(`Imported ${r.created} record(s) as UNVERIFIED. Please review before approving.`);
      setRaw("");
      setShowImport(false);
      refetch();
    } catch (e: any) {
      setImportMsg(e.message);
    } finally {
      setImporting(false);
    }
  }

  const residents = data?.residents ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Resident Directory</h1>
          <p className="text-sm text-slate-500">Searchable estate residents & gate access control</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setShowAdd((x) => !x); setShowImport(false); }} className="btn-primary">
            <UserPlus className="h-4 w-4" /> Add Resident
          </button>
          <button onClick={() => { setShowImport((x) => !x); setShowAdd(false); }} className="btn-secondary">
            <FileUp className="h-4 w-4" /> Import Notebook Records
          </button>
        </div>
      </div>

      {showAdd && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Add a New Resident</h2>
            <button onClick={() => setShowAdd(false)} className="btn-ghost text-xs">Close</button>
          </div>
          <ResidentForm
            onSuccess={(res) => {
              setAddedMsg(`${res.resident.firstName} ${res.resident.lastName} added successfully.`);
              setShowAdd(false);
              setShowImport(false);
              refetch();
            }}
          />
          {addedMsg && <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{addedMsg}</div>}
        </div>
      )}

      {showImport && (
        <div className="card space-y-3 p-4">
          <p className="text-sm text-slate-600">
            Paste handwritten notebook records — one per line, as{" "}
            <code className="rounded bg-slate-100 px-1">Name, Phone, Unit</code>. These are added as{" "}
            <strong>UNVERIFIED</strong> imports until estate management confirms them.
          </p>
          <textarea
            className="input h-32 font-mono text-xs"
            placeholder={"Adewale Adebayo, 08012345678, B1\nNgozi Okafor, 08098765432, B2"}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
          {importMsg && <div className="text-sm text-sky-700">{importMsg}</div>}
          <div className="flex gap-2">
            <button onClick={doImport} disabled={importing} className="btn-primary">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import as Unverified"}
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="input sm:max-w-xs"
          placeholder="Search name, phone, or unit…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {[
            { label: "All", value: "" },
            { label: "Active (Paid)", value: "ACTIVE" },
            { label: "Suspended (Unpaid Dues)", value: "SUSPENDED" },
            { label: "Inactive", value: "INACTIVE" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                statusFilter === tab.value
                  ? "bg-white text-brand-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data && <PageLoader />}
      {data && residents.length === 0 && (
        <EmptyState
          title="No residents found"
          description={statusFilter ? `No residents with status "${statusFilter}"` : "Add residents or click Import Notebook."}
        />
      )}
      {residents.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Resident</th>
                  <th>Unit</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th>Gate Access Status</th>
                  <th>Vehicles</th>
                  <th>Verified</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {residents.map((r: any) => (
                  <tr key={r.id}>
                    <td>
                      <p className="font-medium text-slate-800">{r.firstName} {r.lastName}</p>
                      <p className="text-xs text-slate-400">{r.email || "—"}</p>
                    </td>
                    <td className="font-semibold text-slate-700">{r.property?.unitNumber ? `Unit ${r.property.unitNumber}` : "—"}</td>
                    <td className="text-slate-600">{r.phone || "—"}</td>
                    <td className="text-xs font-semibold text-slate-500 uppercase">{r.residentType}</td>
                    <td>
                      {r.propertyStatus === "SUSPENDED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                          <ShieldBan className="h-3 w-3" /> Suspended (Unpaid Dues)
                        </span>
                      ) : r.propertyStatus === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                          <ShieldCheck className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="text-slate-600 text-xs">
                      {r.vehicles?.length ? r.vehicles.map((v: any) => v.plateNumber).join(", ") : "—"}
                    </td>
                    <td>
                      {r.verified ? (
                        <Badge status="APPROVED" label="Verified" />
                      ) : (
                        <Badge status="PENDING" label={r.source === "NOTEBOOK_IMPORT" ? "Unverified" : "Not verified"} />
                      )}
                    </td>
                    <td>
                      <Link href={`/residents/${r.id}`} className="text-sm font-bold text-brand-600 hover:underline">
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
