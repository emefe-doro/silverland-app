"use client";

import { useState } from "react";
import type { SessionUser } from "@/lib/auth";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <Sidebar open={open} user={user} onClose={() => setOpen(false)} />
      <div className="lg:pl-64">
        <Topbar user={user} onMenu={() => setOpen(true)} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
