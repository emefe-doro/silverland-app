"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (token) {
      router.replace("/terminal");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center p-6 bg-slate-900 text-white">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
    </div>
  );
}
