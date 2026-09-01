"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { getToken, clearToken, SessionUser } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/Spinner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    let mounted = true;
    apiFetch<{ user: SessionUser }>("/api/auth/session")
      .then((d) => {
        if (mounted) setUser(d.user);
      })
      .catch(() => {
        clearToken();
        if (mounted) router.replace("/login");
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });
    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) return <PageLoader />;
  if (!user) return null;

  return <AppShell user={user}>{children}</AppShell>;
}
