"use client";

import { useState } from "react";
import DispatchList from "@/components/DispatchList";
import Link from "next/link";
import { Bike } from "lucide-react";

export default function DispatchPage() {
  const [filter, setFilter] = useState("");
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dispatch Riders</h1>
          <p className="text-sm text-slate-500">Entering and departing deliveries</p>
        </div>
        <Link href="/dispatch/register" className="btn-primary"><Bike className="h-4 w-4" /> New Dispatch</Link>
      </div>
      <div className="flex gap-2">
        {["", "PENDING", "APPROVED", "INSIDE", "EXITED"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${filter === s ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {s || "All"}
          </button>
        ))}
      </div>
      <DispatchList filter={filter} />
    </div>
  );
}
