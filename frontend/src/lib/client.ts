import { getToken } from "@/lib/auth";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ApiError = { error: string; code?: string };

type ApiOptions = Omit<RequestInit, "body"> & { body?: unknown };

// Prefix internal routes with the backend base and attach the bearer token.
export function apiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE}${path}`;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = typeof window !== "undefined" ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function apiFetch<T>(url: string, options?: ApiOptions): Promise<T> {
  const res = await fetch(apiUrl(url), {
    method: options?.method ?? "GET",
    headers: {
      ...authHeaders(),
      ...(options?.headers as Record<string, string> | undefined),
    },
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    // Redirect to login on auth failure
    if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      localStorage.removeItem("silverland_token");
      window.location.href = "/login";
    }
    const msg = (data as ApiError)?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

// Build a query string from a params object (skips empty values).
export function qs(params: Record<string, string>): string {
  const pairs = Object.entries(params)
    .map(([k, v]) => ({ k, v }))
    .filter(({ v }) => v !== "" && v != null)
    .map(({ k, v }) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return pairs.length ? `?${pairs.join("&")}` : "";
}
