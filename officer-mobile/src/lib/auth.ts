export type Role = "SUPER_ADMIN" | "ESTATE_MANAGEMENT" | "SECURITY_OFFICER" | "RESIDENT";

export type SessionUser = {
  sub: string;
  role: Role;
  name: string;
  email: string;
  officerId?: string | null;
  badgeNumber?: string | null;
  station?: string | null;
};

export const TOKEN_STORAGE_KEY = "silverland_officer_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}
