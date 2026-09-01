export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Silverland Zone";
export const APP_SUBTITLE =
  process.env.NEXT_PUBLIC_ESTATE_SUBTITLE || "Tedo Housing Estate";

export const Roles = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ESTATE_MANAGEMENT: "ESTATE_MANAGEMENT",
  SECURITY_OFFICER: "SECURITY_OFFICER",
  RESIDENT: "RESIDENT",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

// Central RBAC: which roles may access each named permission.
export const PERMISSION = {
  VIEW_DASHBOARD: ["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER", "RESIDENT"],
  MANAGE_USERS: ["SUPER_ADMIN"],
  MANAGE_RESIDENTS: ["SUPER_ADMIN", "ESTATE_MANAGEMENT"],
  MANAGE_OFFICERS: ["SUPER_ADMIN", "ESTATE_MANAGEMENT"],
  EDIT_SETTINGS: ["SUPER_ADMIN"],
  APPROVE_VISITORS: ["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"],
  GATE_OPERATIONS: ["SUPER_ADMIN", "SECURITY_OFFICER"],
  VIEW_ALL_ACCESS_LOGS: ["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"],
  VIEW_REPORTS: ["SUPER_ADMIN", "ESTATE_MANAGEMENT"],
  EXPORT_DATA: ["SUPER_ADMIN", "ESTATE_MANAGEMENT"],
  RESIDENT_PORTAL: ["RESIDENT"],
} as const;

export type Permission = keyof typeof PERMISSION;

export function can(role: Role, permission: Permission): boolean {
  const allowed = PERMISSION[permission] as readonly string[];
  return allowed.includes(role);
}

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ESTATE_MANAGEMENT: "Estate Management",
  SECURITY_OFFICER: "Security Officer",
  RESIDENT: "Resident",
};

export const VISITOR_TYPE_LABEL: Record<string, string> = {
  GUEST: "Guest",
  FAMILY: "Family",
  DELIVERY: "Delivery",
  SERVICE: "Service",
  CONTRACTOR: "Contractor",
  OTHER: "Other",
};

export const PASST_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  USED: "Used",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  REVOKED: "Revoked",
};

export const VISITOR_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DENIED: "Denied",
  CANCELLED: "Cancelled",
  EXPECTED: "Expected",
  UNEXPECTED: "Unexpected",
  EXPIRED: "Expired",
};

export const DISPATCH_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DENIED: "Denied",
  INSIDE: "Inside",
  EXITED: "Exited",
  EXPIRED: "Expired",
};
