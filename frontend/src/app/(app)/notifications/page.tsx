"use client";

import { useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import Badge from "@/components/ui/Badge";
import { PageLoader, EmptyState } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/client";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

export default function NotificationsPage() {
  const { data, loading, error, refetch } = useApi<any>("/api/notifications?limit=100");
  const items = data?.notifications ?? [];

  useEffect(() => {
    if (data?.unread) {
      apiFetch("/api/notifications", { method: "POST", body: {} }).then(() => refetch());
    }
  }, [data, refetch]);

  if (loading && !data) return <PageLoader />;
  if (error) return <p className="text-red-600">{error}</p>;

  const mk = (t: string) => {
    if (t === "SECURITY_ALERT") return <Badge status="DENIED" label="Alert" />;
    if (t === "VISITOR_APPROVAL") return <Badge status="APPROVED" label="Approved" />;
    if (t === "VISITOR_DENIED") return <Badge status="DENIED" label="Denied" />;
    if (t === "DISPATCH_ARRIVAL") return <Badge status="PENDING" label="Dispatch" />;
    return <Badge status="INFORMATION" label={t.replace("_", " ")} />;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
        <p className="text-sm text-slate-500">{data?.unread ?? 0} unread</p>
      </div>
      {items.length === 0 && <EmptyState title="No notifications" description="Arrival, approval and dispatch updates will appear here." />}
      <div className="space-y-2">
        {items.map((n: any) => (
          <div key={n.id} className="card flex items-start gap-3 p-4">
            <div className="mt-0.5">{mk(n.type)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-700">{n.title}</p>
              <p className="text-sm text-slate-500">{n.message}</p>
              <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.createdAt)}</p>
            </div>
            {n.link && <Link href={n.link} className="text-xs font-medium text-brand-600 hover:underline">Open</Link>}
          </div>
        ))}
      </div>
    </div>
  );
}
