"use client";

import { useState } from "react";
import VisitorForm from "@/components/forms/VisitorForm";
import Link from "next/link";

export default function VisitorsRegisterPage() {
  const [done, setDone] = useState<{ visitor: any } | null>(null);
  if (done) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card p-8 text-center">
          <p className="text-lg font-semibold text-emerald-700">Visitor registered.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href={`/visitors/${done.visitor.id}`} className="btn-primary">View Pass</Link>
            <button onClick={() => setDone(null)} className="btn-secondary">New</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-slate-800">Register Visitor</h1>
      <VisitorForm onSuccess={(res) => setDone(res as any)} />
    </div>
  );
}
