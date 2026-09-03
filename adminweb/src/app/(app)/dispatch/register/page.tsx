"use client";

import { useState } from "react";
import DispatchForm from "@/components/forms/DispatchForm";
import Link from "next/link";

export default function DispatchRegisterPage() {
  const [done, setDone] = useState<any>(null);
  if (done) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card p-8 text-center">
          <p className="text-lg font-semibold text-emerald-700">Dispatch rider registered.</p>
          <p className="mt-1 text-sm text-slate-500">Status: {done.rider.status}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/dispatch" className="btn-primary">Go to dispatch</Link>
            <button onClick={() => setDone(null)} className="btn-secondary">Add another</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-slate-800">Register Dispatch Rider</h1>
      <DispatchForm onSuccess={(res) => setDone(res)} />
    </div>
  );
}
