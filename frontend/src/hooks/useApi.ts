"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/client";

export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const refetch = useCallback(async () => {
    if (!url) return;
    const mySeq = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<T>(url);
      if (mySeq === seq.current) setData(result);
    } catch (e: any) {
      if (mySeq === seq.current) setError(e.message || "Failed to load.");
    } finally {
      if (mySeq === seq.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, setData, refetch };
}

export function useApiPost<T>(url: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (body?: unknown): Promise<T> => {
      setBusy(true);
      setError(null);
      try {
        const r = await apiFetch<T>(url, { method: "POST", body });
        return r;
      } catch (e: any) {
        setError(e.message || "Request failed.");
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [url]
  );

  return { busy, error, run, setError };
}
