"use client";

import { useApi } from "@/hooks/useApi";
import VisitorForm from "@/components/forms/VisitorForm";
import { PageLoader } from "@/components/ui/Spinner";
import { useState } from "react";
import Link from "next/link";

export default function ResidentRegisterVisitor() {
  const { data, loading, error } = useApi<any>("/api/resident/profile");
  const [created, setCreated] = useState<any>(null);

  let me: any = null;
  if (data?.resident) {
    const r = data.resident;
    me = {
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone,
      property: r.property ? { unitNumber: r.property.unitNumber } : null,
    };
  }

  if (loading) return <PageLoader />;
  if (error) return <p className="text-red-600">{error}</p>;

  if (created) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card p-8 text-center">
          <p className="text-lg font-semibold text-emerald-700">Visitor pass generated.</p>
          <p className="mt-1 text-sm text-slate-500">Show the QR to {created.visitor.fullName} or send it to them.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href={`/visitors/${created.visitor.id}`} className="btn-primary">View Pass</Link>
            <button onClick={() => setCreated(null)} className="btn-secondary">Register another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-slate-800">Pre-register a Visitor</h1>
      <p className="mb-4 text-sm text-slate-500">Inviting a guest? Register them now to generate a QR access pass.</p>
      <VisitorForm fixedResident={me} onSuccess={(res) => setCreated(res)} submitLabel="Generate Visitor Pass" />
    </div>
  );
}
