"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import DispatchList from "@/components/DispatchList";
import DispatchForm from "@/components/forms/DispatchForm";
import { PageLoader } from "@/components/ui/Spinner";
import { Bike, UserPlus } from "lucide-react";

export default function ResidentDispatchPage() {
  const profile = useApi<any>("/api/resident/profile");
  const [tab, setTab] = useState<"list" | "new">("list");
  const [created, setCreated] = useState<any>(null);

  const r = profile.data?.resident;
  const me = r ? { id: r.id, firstName: r.firstName, lastName: r.lastName, phone: r.phone, property: r.property ? { unitNumber: r.property.unitNumber } : null } : null;

  if (profile.loading) return <PageLoader />;
  if (profile.error) return <p className="text-red-600">{profile.error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dispatch Riders</h1>
          <p className="text-sm text-slate-500">Approving deliveries coming to you</p>
        </div>
        <button onClick={() => setTab(tab === "list" ? "new" : "list")} className="btn-secondary">
          {tab === "list" ? <><UserPlus className="h-4 w-4" /> Register rider</> : <><Bike className="h-4 w-4" /> My riders</>}
        </button>
      </div>

      {tab === "list" && <DispatchList filter="" />}

      {tab === "new" && (
        <div>
          {created ? (
            <div className="card p-6 text-center">
              <p className="text-lg font-semibold text-emerald-700">Dispatch rider registered.</p>
              <p className="text-sm text-slate-500">Status: {created.rider.status}</p>
              <div className="mt-4 flex justify-center gap-2">
                <button onClick={() => setTab("list")} className="btn-primary">View riders</button>
                <button onClick={() => setCreated(null)} className="btn-secondary">Add another</button>
              </div>
            </div>
          ) : (
            <DispatchForm fixedResident={me} onSuccess={(res) => setCreated(res)} submitLabel="Register rider" />
          )}
        </div>
      )}
    </div>
  );
}
