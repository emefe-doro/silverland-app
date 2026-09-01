"use client";

// Client-side auth. The JWT is issued by the backend and stored in
// localStorage; every API call attaches it as a Bearer token.
import { Role } from "@/lib/constants";

export type SessionUser = {
  sub: string;
  role: Role;
  name: string;
  email: string;
  residentId?: string | null;
  officerId?: string | null;
};

export const TOKEN_STORAGE_KEY = "silverland_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}
