"use client";

import { useState } from "react";
import VisitorForm from "@/components/forms/VisitorForm";
import Link from "next/link";
import { CheckCircle2, QrCode } from "lucide-react";

export default function RegisterVisitorPage() {
  const [created, setCreated] = useState<{ visitor: any; pass: any } | null>(null);

  if (created) {
    const vid = created.visitor.id;
    return (
      <div className="mx-auto max-w-xl">
        <div className="card flex flex-col items-center p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          <h2 className="mt-3 text-xl font-bold text-slate-800">Visitor Registered</h2>
          <p className="mt-1 text-sm text-slate-500">
            {created.visitor.fullName} · pass #{created.pass.token.slice(0, 10)}
          </p>
          <div className="mt-5 grid w-full grid-cols-2 gap-3">
            <Link href={`/visitors/${vid}`} className="btn-primary">
              <QrCode className="h-5 w-5" /> Show QR Pass
            </Link>
            <button onClick={() => setCreated(null)} className="btn-secondary">
              Register Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-slate-800">Register Visitor</h1>
      <VisitorForm onSuccess={(res) => setCreated(res)} submitLabel="Register Visitor & Generate Pass" />
    </div>
  );
}
