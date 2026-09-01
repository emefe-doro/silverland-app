"use client";

import { useApi } from "@/hooks/useApi";
import { PageLoader, EmptyState } from "@/components/ui/Spinner";
import { Car } from "lucide-react";

export default function VehiclesPage() {
  const { data, loading, error } = useApi<any>("/api/vehicles");
  if (error) return <p className="text-red-600">{error}</p>;
  const vehicles = data?.vehicles ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Vehicles</h1>
        <p className="text-sm text-slate-500">Registered resident vehicles</p>
      </div>
      {loading && !data && <PageLoader />}
      {data && vehicles.length === 0 && <EmptyState title="No vehicles" description="Residents have no vehicles registered." />}
      {vehicles.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Plate</th><th>Make / Model</th><th>Type</th><th>Color</th><th>Owner</th><th>Unit</th></tr>
              </thead>
              <tbody>
                {vehicles.map((v: any) => (
                  <tr key={v.id}>
                    <td className="font-semibold text-slate-700">{v.plateNumber}</td>
                    <td className="text-slate-600">{v.make || "—"}</td>
                    <td className="text-slate-600">{v.type || "—"}</td>
                    <td className="text-slate-600">{v.color || "—"}</td>
                    <td className="text-slate-600">{v.resident ? `${v.resident.firstName} ${v.resident.lastName}` : "—"}</td>
                    <td className="text-slate-600">{v.resident?.property?.unitNumber || "—"}</td>
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
